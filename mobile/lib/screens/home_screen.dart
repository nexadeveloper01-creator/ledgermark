import 'package:flutter/material.dart';
import '../api.dart';
import '../theme.dart';
import 'scan_tab.dart';
import 'status_tab.dart';
import 'products_tab.dart';

class HomeScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final Future<void> Function() onLogout;
  const HomeScreen({super.key, required this.user, required this.onLogout});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _index = 0;
  String? _lastRequestId; // 스캔 탭에서 등록 신청 후 상태 탭으로 넘길 때 사용

  String get _consumerId => widget.user['consumerId'] as String? ?? '';
  bool get _emailVerified => widget.user['emailVerified'] == true;

  void _goStatus(String requestId) {
    setState(() {
      _lastRequestId = requestId;
      _index = 1;
    });
  }

  @override
  Widget build(BuildContext context) {
    final tabs = [
      ScanTab(
        consumerId: _consumerId,
        emailVerified: _emailVerified,
        onRegistered: _goStatus,
      ),
      StatusTab(consumerId: _consumerId, highlightRequestId: _lastRequestId),
      ProductsTab(consumerId: _consumerId),
    ];

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Lm.bg,
        surfaceTintColor: Lm.bg,
        elevation: 0,
        shape: const Border(bottom: BorderSide(color: Lm.divider)),
        titleSpacing: 20,
        title: Row(
          children: [
            const Text('LEDGERMARK',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, letterSpacing: 1.4)),
            const SizedBox(width: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(border: Border.all(color: Lm.divider)),
              child: const Text('CONSUMER',
                  style: TextStyle(fontSize: 10, letterSpacing: 1.4, color: Lm.accent700)),
            ),
          ],
        ),
        actions: [
          Center(
            child: Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Text(widget.user['displayName'] as String? ?? '',
                  style: const TextStyle(fontSize: 12, color: Lm.muted)),
            ),
          ),
          IconButton(
            tooltip: '로그아웃',
            icon: const Icon(Icons.logout, size: 18, color: Lm.muted),
            onPressed: widget.onLogout,
          ),
        ],
      ),
      body: Column(
        children: [
          if (!_emailVerified) _VerifyBanner(),
          Expanded(child: tabs[_index]),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        backgroundColor: Lm.surface,
        indicatorColor: Lm.accent100,
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.qr_code_scanner), label: 'UID 스캔'),
          NavigationDestination(icon: Icon(Icons.assignment_turned_in), label: '등록 상태'),
          NavigationDestination(icon: Icon(Icons.inventory_2), label: '내 제품'),
        ],
      ),
    );
  }
}

class _VerifyBanner extends StatefulWidget {
  @override
  State<_VerifyBanner> createState() => _VerifyBannerState();
}

class _VerifyBannerState extends State<_VerifyBanner> {
  String? _message;
  bool _sending = false;

  Future<void> _resend() async {
    setState(() => _sending = true);
    try {
      await api.resendVerification();
      setState(() => _message = '인증 메일을 다시 보냈습니다.');
    } catch (e) {
      setState(() => _message = '재발송에 실패했습니다.');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: Lm.accent100,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '이메일 인증이 완료되지 않았습니다. 메일의 링크를 열어 인증하면 정품 등록을 신청할 수 있습니다.',
            style: TextStyle(fontSize: 12, color: Lm.accent900, height: 1.5),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              OutlinedButton(
                onPressed: _sending ? null : _resend,
                style: OutlinedButton.styleFrom(minimumSize: const Size(0, 34)),
                child: const Text('인증 메일 다시 보내기', style: TextStyle(fontSize: 12)),
              ),
              if (_message != null) ...[
                const SizedBox(width: 10),
                Flexible(
                  child: Text(_message!,
                      style: const TextStyle(fontSize: 11, color: Lm.muted)),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
