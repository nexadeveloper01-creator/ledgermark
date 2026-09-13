import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api.dart';
import 'i18n.dart';
import 'theme.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/onboarding_screen.dart';

Future<void> main() async {
  // 위젯 빌드 중 예외가 나도 회색/빈 화면 대신 읽을 수 있는 메시지를 보여준다.
  ErrorWidget.builder = (FlutterErrorDetails details) => Directionality(
        textDirection: TextDirection.ltr,
        child: Container(
          color: const Color(0xFF7A1220),
          alignment: Alignment.center,
          padding: const EdgeInsets.all(24),
          child: SingleChildScrollView(
            child: Text(
              'APP ERROR\n\n${details.exceptionAsString()}',
              style: const TextStyle(color: Colors.white, fontSize: 13, height: 1.5),
            ),
          ),
        ),
      );

  runZonedGuarded(() async {
    WidgetsFlutterBinding.ensureInitialized();
    try {
      await i18n.load();
    } catch (_) {
      // 언어 로드 실패는 무시하고 계속 (기본 언어로 뜨게 한다).
    }
    runApp(const LedgermarkApp());
  }, (error, stack) {
    // 시작 단계에서 잡히지 않은 오류도 최소한 앱이 뜨도록 화면에 표시.
    runApp(_FatalError(message: '$error'));
  });
}

class _FatalError extends StatelessWidget {
  final String message;
  const _FatalError({required this.message});
  @override
  Widget build(BuildContext context) => MaterialApp(
        debugShowCheckedModeBanner: false,
        home: Scaffold(
          backgroundColor: const Color(0xFF7A1220),
          body: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: SingleChildScrollView(
                child: Text('START ERROR\n\n$message',
                    style: const TextStyle(color: Colors.white, fontSize: 13, height: 1.5)),
              ),
            ),
          ),
        ),
      );
}

class LedgermarkApp extends StatelessWidget {
  const LedgermarkApp({super.key});

  @override
  Widget build(BuildContext context) {
    // 언어가 바뀌면 앱 전체를 다시 그린다(설정에서 전환 시 즉시 반영).
    return ListenableBuilder(
      listenable: i18n,
      builder: (context, _) => MaterialApp(
        title: 'ConiaMark',
        debugShowCheckedModeBanner: false,
        theme: buildTheme(),
        locale: i18n.localeOverride,
        supportedLocales: const [Locale('en'), Locale('ko'), Locale('fil')],
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        home: const AuthGate(),
      ),
    );
  }
}

// 저장된 토큰으로 세션을 복원하고, 성인 확인 뒤 소비자면 홈으로 보낸다.
class AuthGate extends StatefulWidget {
  const AuthGate({super.key});
  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  Map<String, dynamic>? _user;
  bool _loading = true;
  bool _ageOk = false;
  bool _onboarded = false;

  @override
  void initState() {
    super.initState();
    _restore();
  }

  Future<void> _restore() async {
    final prefs = await SharedPreferences.getInstance();
    _ageOk = prefs.getBool('lm_age_ok') ?? false;
    _onboarded = prefs.getBool('lm_onboarded') ?? false;
    await api.loadToken();
    Map<String, dynamic>? user;
    if (api.isAuthenticated) {
      try {
        user = await api.me();
      } catch (_) {
        user = null;
      }
    }
    if (!mounted) return;
    setState(() {
      _user = user;
      _loading = false;
    });
  }

  Future<void> _confirmAge() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('lm_age_ok', true);
    if (mounted) setState(() => _ageOk = true);
  }

  Future<void> _finishOnboarding() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('lm_onboarded', true);
    if (mounted) setState(() => _onboarded = true);
  }

  void _onLoggedIn(Map<String, dynamic> user) => setState(() => _user = user);

  Future<void> _onLogout() async {
    await api.logout();
    if (mounted) setState(() => _user = null);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator(color: Lm.primary)));
    }

    // 스토어 정책: 니코틴 관련 서비스는 성인 확인이 선행돼야 한다.
    if (!_ageOk) {
      return _AgeGate(onConfirm: _confirmAge);
    }

    // 첫 실행 온보딩(정품 확인 → 등록·교환권 → 포인트/혜택).
    if (!_onboarded) {
      return OnboardingScreen(onDone: _finishOnboarding);
    }

    final user = _user;
    if (user == null) {
      return LoginScreen(onLoggedIn: _onLoggedIn);
    }
    if (user['role'] != 'CONSUMER') {
      return _WrongRole(user: user, onLogout: _onLogout);
    }
    return HomeScreen(user: user, onLogout: _onLogout);
  }
}

// 만 20세 이상 성인 확인 게이트.
class _AgeGate extends StatelessWidget {
  final VoidCallback onConfirm;
  const _AgeGate({required this.onConfirm});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Lm.dark,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.verified_user_rounded, color: Colors.white, size: 44),
              const SizedBox(height: 18),
              Text(tr('age.title'),
                  style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800)),
              const SizedBox(height: 12),
              Text(tr('age.body'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white70, fontSize: 15, height: 1.6)),
              const SizedBox(height: 24),
              SizedBox(
                width: 260,
                child: FilledButton(
                  onPressed: onConfirm,
                  style: FilledButton.styleFrom(
                    backgroundColor: Lm.primary,
                    minimumSize: const Size.fromHeight(52),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: Text(tr('age.yes')),
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: 260,
                child: TextButton(
                  onPressed: () => showDialog(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      content: Text(tr('age.blocked')),
                      actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: Text(tr('common.close')))],
                    ),
                  ),
                  child: Text(tr('age.no'), style: const TextStyle(color: Colors.white54)),
                ),
              ),
              const SizedBox(height: 18),
              Text(tr('age.notice'), style: const TextStyle(color: Colors.white38, fontSize: 11)),
            ],
          ),
        ),
      ),
    );
  }
}

class _WrongRole extends StatelessWidget {
  final Map<String, dynamic> user;
  final Future<void> Function() onLogout;
  const _WrongRole({required this.user, required this.onLogout});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('This app is for consumers only.',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Text('${user['email']}', style: const TextStyle(color: Lm.muted)),
              const SizedBox(height: 20),
              OutlinedButton(onPressed: onLogout, child: Text(tr('home.logout'))),
            ],
          ),
        ),
      ),
    );
  }
}
