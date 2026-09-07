import 'package:flutter/material.dart';
import '../api.dart';
import '../i18n.dart';
import '../theme.dart';
import 'dashboard_tab.dart';
import 'scan_flow.dart';
import 'status_tab.dart';
import 'products_tab.dart';
import 'rewards_tab.dart';
import 'consent_screen.dart';
import 'settings_screen.dart';

class HomeScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final Future<void> Function() onLogout;
  const HomeScreen({super.key, required this.user, required this.onLogout});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _index = 0;
  int _reloadKey = 0; // 탭 데이터 강제 새로고침용
  String? _lastRequestId;

  String get _consumerId => widget.user['consumerId'] as String? ?? '';
  bool get _emailVerified => widget.user['emailVerified'] == true;

  @override
  void initState() {
    super.initState();
    // 최초 로그인(동의 이력 없음) 시 동의 화면을 한 번 안내한다. 이미 동의한 계정은 뜨지 않는다.
    WidgetsBinding.instance.addPostFrameCallback((_) => _maybePromptConsent());
  }

  Future<void> _maybePromptConsent() async {
    try {
      final c = await api.getConsent();
      final scopes = (c['scopes'] as Map?) ?? {};
      final anyGranted = scopes.values.any((v) => v == true);
      if (!anyGranted && mounted) {
        await Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ConsentScreen()));
        if (mounted) setState(() => _reloadKey++);
      }
    } catch (_) {
      // 동의 확인 실패는 조용히 무시
    }
  }

  void _openSettings() {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => SettingsScreen(user: widget.user, onLogout: widget.onLogout),
    ));
  }

  Future<void> _openScan() async {
    final requestId = await Navigator.of(context).push<String>(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => ScanFlowScreen(consumerId: _consumerId, emailVerified: _emailVerified),
      ),
    );
    if (!mounted) return;
    // 스캔 흐름이 등록 신청까지 마치면 등록 상태 탭으로, 그 외엔 데이터만 새로고침.
    setState(() {
      _reloadKey++;
      if (requestId != null) {
        _lastRequestId = requestId;
        _index = 1;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final tabs = [
      DashboardTab(
        key: ValueKey('dash$_reloadKey'),
        user: widget.user,
        onScan: _openScan,
        onOpenRewards: () => setState(() => _index = 3),
        onOpenSettings: _openSettings,
      ),
      StatusTab(
        key: ValueKey('status$_reloadKey'),
        consumerId: _consumerId,
        highlightRequestId: _lastRequestId,
      ),
      ProductsTab(key: ValueKey('prod$_reloadKey'), consumerId: _consumerId),
      RewardsTab(key: ValueKey('rewards$_reloadKey'), consumerId: _consumerId),
    ];

    return Scaffold(
      extendBody: true,
      body: Column(
        children: [
          if (!_emailVerified) SafeArea(bottom: false, child: _VerifyBanner()),
          Expanded(child: tabs[_index]),
        ],
      ),
      bottomNavigationBar: _PillNav(
        index: _index,
        onSelect: (i) => setState(() => _index = i),
        onScan: _openScan,
      ),
    );
  }
}

// 어두운 알약형 하단 내비 + 파란 원형 "+" (스캔) 버튼.
class _PillNav extends StatelessWidget {
  final int index;
  final ValueChanged<int> onSelect;
  final VoidCallback onScan;
  const _PillNav({required this.index, required this.onSelect, required this.onScan});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 0, 18, 14),
        child: Row(
          children: [
            Expanded(
              child: Container(
                height: 64,
                decoration: BoxDecoration(
                  color: Lm.dark,
                  borderRadius: BorderRadius.circular(32),
                  boxShadow: const [
                    BoxShadow(color: Color(0x2914161C), blurRadius: 20, offset: Offset(0, 8)),
                  ],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _navIcon(Icons.home_rounded, 0),
                    _navIcon(Icons.assignment_turned_in_rounded, 1),
                    _navIcon(Icons.inventory_2_rounded, 2),
                    _navIcon(Icons.card_giftcard_rounded, 3),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 12),
            GestureDetector(
              onTap: onScan,
              child: Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: Lm.primary,
                  shape: BoxShape.circle,
                  boxShadow: const [
                    BoxShadow(color: Color(0x552E6BFF), blurRadius: 18, offset: Offset(0, 8)),
                  ],
                ),
                child: const Icon(Icons.qr_code_scanner_rounded, color: Colors.white, size: 28),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _navIcon(IconData icon, int i) {
    final selected = index == i;
    return IconButton(
      onPressed: () => onSelect(i),
      icon: Icon(icon, color: selected ? Colors.white : Colors.white38, size: 26),
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
      setState(() => _message = tr('verify.sent'));
    } catch (_) {
      setState(() => _message = tr('verify.resendFail'));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Lm.warnBg, borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.mark_email_unread_rounded, color: Lm.warnFg, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(tr('verify.banner'),
                    style: const TextStyle(fontSize: 12.5, color: Lm.warnFg, height: 1.4)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              TextButton(
                onPressed: _sending ? null : _resend,
                style: TextButton.styleFrom(
                  foregroundColor: Lm.warnFg,
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  minimumSize: const Size(0, 30),
                ),
                child: Text(tr('verify.resend'), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
              ),
              if (_message != null)
                Flexible(child: Text(_message!, style: const TextStyle(fontSize: 11, color: Lm.warnFg))),
            ],
          ),
        ],
      ),
    );
  }
}
