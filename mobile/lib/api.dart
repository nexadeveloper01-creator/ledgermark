import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiException implements Exception {
  final int status;
  final String message;
  ApiException(this.status, this.message);
  @override
  String toString() => message;
}

// LEDGERMARK REST API 클라이언트.
// 웹과 달리 쿠키를 쓰지 않고 로그인 시 받은 세션 토큰을 Authorization: Bearer로 보낸다.
class Api {
  // 기본값은 로컬 Next.js 서버. 다른 호스트를 쓰려면 --dart-define=API_BASE=... 로 주입한다.
  static const String baseUrl =
      String.fromEnvironment('API_BASE', defaultValue: 'http://localhost:3000');

  static const _tokenKey = 'lm_token';
  String? _token;

  String? get token => _token;
  bool get isAuthenticated => _token != null;

  Future<void> loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString(_tokenKey);
  }

  Future<void> _saveToken(String? token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    if (token == null) {
      await prefs.remove(_tokenKey);
    } else {
      await prefs.setString(_tokenKey, token);
    }
  }

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  Uri _uri(String path) => Uri.parse('$baseUrl$path');

  dynamic _decode(http.Response res) {
    final body = res.body.isEmpty ? {} : jsonDecode(res.body);
    if (res.statusCode >= 200 && res.statusCode < 300) return body;
    final msg = body is Map && body['error'] is String
        ? body['error'] as String
        : '요청에 실패했습니다 (${res.statusCode}).';
    throw ApiException(res.statusCode, msg);
  }

  Future<dynamic> get(String path) async {
    final res = await http.get(_uri(path), headers: _headers);
    return _decode(res);
  }

  Future<dynamic> post(String path, [Map<String, dynamic>? body]) async {
    final res = await http.post(_uri(path), headers: _headers, body: jsonEncode(body ?? {}));
    return _decode(res);
  }

  // ── 인증 ─────────────────────────────────────────────
  // 로그인/가입 응답의 user는 최소 필드만 담으므로, 토큰 저장 후 me()로 전체 프로필
  // (consumerId·emailVerified 포함)을 받아 단일 소스로 삼는다.
  Future<Map<String, dynamic>> login(String email, String password) async {
    final data = await post('/api/auth/login', {'email': email, 'password': password});
    await _saveToken(data['token'] as String?);
    return (await me())!;
  }

  Future<Map<String, dynamic>> signup(String email, String displayName, String password) async {
    final data = await post('/api/auth/signup',
        {'email': email, 'displayName': displayName, 'password': password, 'country': 'PH'});
    await _saveToken(data['token'] as String?);
    return (await me())!;
  }

  Future<Map<String, dynamic>?> me() async {
    try {
      final data = await get('/api/auth/me');
      return Map<String, dynamic>.from(data['user'] as Map);
    } on ApiException catch (e) {
      if (e.status == 401) return null;
      rethrow;
    }
  }

  Future<void> logout() async {
    try {
      await post('/api/auth/logout');
    } catch (_) {
      // 서버 실패와 무관하게 로컬 토큰은 지운다.
    }
    await _saveToken(null);
  }

  // ── 소비자 기능 ──────────────────────────────────────
  Future<Map<String, dynamic>> lookupUid(String code) async {
    final data = await get('/api/uid/${Uri.encodeComponent(code)}');
    return Map<String, dynamic>.from(data['uid'] as Map);
  }

  Future<Map<String, dynamic>> verifyAge(String consumerId, Map<String, dynamic> input) async {
    return Map<String, dynamic>.from(
        await post('/api/consumers/$consumerId/verify-age', {'country': 'PH', 'input': input}));
  }

  Future<Map<String, dynamic>> requestRegistration(String uidCode) async {
    final data =
        await post('/api/requests', {'type': 'RETAIL_SALE', 'uidCode': uidCode, 'ageVerified': true});
    return Map<String, dynamic>.from(data['request'] as Map);
  }

  Future<List<dynamic>> myRequests(String consumerId) async {
    final data = await get('/api/requests?consumerId=$consumerId');
    return (data['requests'] as List?) ?? [];
  }

  Future<List<dynamic>> myUids(String consumerId) async {
    final data = await get('/api/consumers/$consumerId/uids');
    return (data['uids'] as List?) ?? [];
  }

  Future<Map<String, dynamic>> requestExchange(String uidCode) async {
    final data =
        await post('/api/requests', {'type': 'EXCHANGE_TRANSFER', 'uidCode': uidCode});
    return Map<String, dynamic>.from(data['request'] as Map);
  }

  Future<Map<String, dynamic>> lookupConsumer(String email) async {
    final data = await post('/api/consumers/lookup', {'email': email});
    return Map<String, dynamic>.from(data['consumer'] as Map);
  }

  Future<void> resell(String uidCode, String fromConsumerId, String toConsumerId) async {
    await post('/api/uid/${Uri.encodeComponent(uidCode)}/transfer', {
      'txType': 'RESALE_TRANSFER',
      'from': {'type': 'CONSUMER', 'consumerId': fromConsumerId},
      'to': {'type': 'CONSUMER', 'consumerId': toConsumerId},
    });
  }

  Future<void> resendVerification() async {
    await post('/api/auth/resend-verification');
  }

  // ── 포인트 / 리워드 ─────────────────────────────────────
  Future<Map<String, dynamic>> pointsSummary() async {
    return Map<String, dynamic>.from(await get('/api/points'));
  }

  Future<Map<String, dynamic>> checkin() async {
    return Map<String, dynamic>.from(await post('/api/points/checkin'));
  }

  Future<List<dynamic>> surveys() async {
    final data = await get('/api/surveys');
    return (data['surveys'] as List?) ?? [];
  }

  Future<Map<String, dynamic>> respondSurvey(String id, Map<String, dynamic> answers) async {
    return Map<String, dynamic>.from(
        await post('/api/surveys/${Uri.encodeComponent(id)}/respond', {'answers': answers}));
  }

  Future<Map<String, dynamic>> rewards() async {
    return Map<String, dynamic>.from(await get('/api/rewards'));
  }

  Future<Map<String, dynamic>> redeemReward(String id) async {
    return Map<String, dynamic>.from(
        await post('/api/rewards/${Uri.encodeComponent(id)}/redeem'));
  }

  // ── 동의 / 쿠폰 / 혜택 ────────────────────────────────
  Future<Map<String, dynamic>> getConsent() async {
    return Map<String, dynamic>.from(await get('/api/consent'));
  }

  Future<Map<String, dynamic>> setConsent(Map<String, bool> scopes) async {
    return Map<String, dynamic>.from(await post('/api/consent', {'scopes': scopes}));
  }

  Future<List<dynamic>> coupons() async {
    final data = await get('/api/coupons');
    return (data['coupons'] as List?) ?? [];
  }

  Future<Map<String, dynamic>> useCoupon(String id) async {
    final data = await post('/api/coupons/${Uri.encodeComponent(id)}/use');
    return Map<String, dynamic>.from(data['coupon'] as Map);
  }

  Future<Map<String, dynamic>> benefits() async {
    return Map<String, dynamic>.from(await get('/api/benefits'));
  }
}

final api = Api();

void log(String m) {
  if (kDebugMode) debugPrint('[lm] $m');
}
