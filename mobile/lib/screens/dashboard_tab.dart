import 'package:flutter/material.dart';
import '../api.dart';
import '../i18n.dart';
import '../theme.dart';
import 'widgets.dart';

class DashboardTab extends StatefulWidget {
  final Map<String, dynamic> user;
  final VoidCallback onScan;
  final VoidCallback onOpenRewards;
  final VoidCallback onOpenSettings;
  const DashboardTab({
    super.key,
    required this.user,
    required this.onScan,
    required this.onOpenRewards,
    required this.onOpenSettings,
  });

  @override
  State<DashboardTab> createState() => _DashboardTabState();
}

class _DashboardTabState extends State<DashboardTab> {
  int _owned = 0, _vouchers = 0, _pending = 0, _committed = 0;
  int _points = 0, _streak = 0;
  bool _checkedIn = true;

  String get _consumerId => widget.user['consumerId'] as String? ?? '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final uids = await api.myUids(_consumerId);
      final reqs = await api.myRequests(_consumerId);
      if (!mounted) return;
      setState(() {
        _owned = uids.length;
        _vouchers = uids.where((u) => u['voucherState'] == 'AVAILABLE').length;
        _pending = reqs.where((r) => r['status'] == 'PENDING').length;
        _committed = reqs.where((r) => r['status'] == 'COMMITTED').length;
      });
    } catch (_) {
      // 대시보드 집계 실패는 조용히 0으로 둔다.
    }
    try {
      final p = await api.pointsSummary();
      if (!mounted) return;
      setState(() {
        _points = (p['balance'] as num?)?.toInt() ?? 0;
        _streak = (p['checkinStreak'] as num?)?.toInt() ?? 0;
        _checkedIn = p['checkedInThisWeek'] == true;
      });
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final name = widget.user['displayName'] as String? ?? '소비자';
    return RefreshIndicator(
      onRefresh: _load,
      color: Lm.primary,
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          _header(name),
          Transform.translate(
            offset: const Offset(0, -28),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(18, 0, 18, 0),
              child: Column(
                children: [
                  _heroCard(),
                  const SizedBox(height: 14),
                  _pointsBanner(),
                  const SizedBox(height: 22),
                  _overview(),
                  const SizedBox(height: 18),
                  _statGrid(),
                  const SizedBox(height: 18),
                  _scanCta(),
                  const SizedBox(height: 18),
                  const AdSlot(
                    assets: adCreatives,
                    aspectRatio: 16 / 9,
                    spec: '1080×608 · 16:9 · 랜덤 회전',
                  ),
                  const SizedBox(height: 110),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _header(String name) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Lm.headerGrad1, Lm.headerGrad2],
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 40),
          child: Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                  boxShadow: Lm.cardShadow,
                ),
                child: const Icon(Icons.person_rounded, color: Lm.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(tr('home.hello'), style: const TextStyle(fontSize: 13, color: Lm.muted)),
                    const SizedBox(height: 2),
                    Text(name,
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, height: 1.1)),
                  ],
                ),
              ),
              IconButton(
                onPressed: widget.onOpenSettings,
                icon: const Icon(Icons.settings_rounded, color: Lm.muted, size: 22),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _heroCard() {
    return Panel(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(tr('dash.ownedGenuine'), style: const TextStyle(fontSize: 13, color: Lm.muted)),
                    const SizedBox(width: 8),
                    _pill(tr('dash.genuineBadge'), Lm.good, Lm.goodBg),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text('$_owned',
                        style: const TextStyle(fontSize: 40, fontWeight: FontWeight.w800, height: 1)),
                    const SizedBox(width: 6),
                    Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Text(tr('dash.registeredCount'), style: const TextStyle(fontSize: 14, color: Lm.muted)),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          _miniBars(),
        ],
      ),
    );
  }

  Widget _pointsBanner() {
    return GestureDetector(
      onTap: widget.onOpenRewards,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
            colors: [Lm.primary, Lm.violet],
          ),
          borderRadius: BorderRadius.circular(Lm.radius),
          boxShadow: Lm.cardShadow,
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(14)),
              child: const Icon(Icons.stars_rounded, color: Colors.white),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(tr('dash.myPoints'), style: const TextStyle(color: Colors.white70, fontSize: 12)),
                  const SizedBox(height: 2),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text('$_points',
                          style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800, height: 1)),
                      const SizedBox(width: 4),
                      const Text('P', style: TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.w700)),
                    ],
                  ),
                ],
              ),
            ),
            if (!_checkedIn)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20)),
                child: Text(tr('dash.checkinCta'), style: const TextStyle(color: Lm.primary, fontSize: 12, fontWeight: FontWeight.w800)),
              )
            else
              Row(
                children: [
                  const Icon(Icons.local_fire_department_rounded, color: Colors.amberAccent, size: 18),
                  const SizedBox(width: 4),
                  Text('$_streak${tr('dash.weeks')}', style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700)),
                ],
              ),
            const SizedBox(width: 6),
            const Icon(Icons.chevron_right_rounded, color: Colors.white70),
          ],
        ),
      ),
    );
  }

  Widget _miniBars() {
    const heights = [16.0, 30.0, 22.0, 40.0, 26.0, 34.0, 20.0];
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        for (var i = 0; i < heights.length; i++)
          Container(
            width: 5,
            height: heights[i],
            margin: const EdgeInsets.symmetric(horizontal: 2),
            decoration: BoxDecoration(
              color: i.isEven ? Lm.primary : Lm.sky.withValues(alpha: 0.4),
              borderRadius: BorderRadius.circular(3),
            ),
          ),
      ],
    );
  }

  Widget _overview() {
    return Row(
      children: [
        Text(tr('dash.overview'), style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
        const SizedBox(width: 8),
        const Text('Overview', style: TextStyle(fontSize: 11, color: Lm.muted, letterSpacing: 1)),
      ],
    );
  }

  Widget _statGrid() {
    final cards = [
      _stat(tr('dash.statOwned'), '$_owned', Icons.inventory_2_rounded, Lm.violet, Lm.violetBg),
      _stat(tr('dash.statVouchers'), '$_vouchers', Icons.card_giftcard_rounded, Lm.mint, Lm.mintBg),
      _stat(tr('dash.statPending'), '$_pending', Icons.hourglass_bottom_rounded, Lm.peach, Lm.peachBg),
      _stat(tr('dash.statCommitted'), '$_committed', Icons.verified_rounded, Lm.sky, Lm.skyBg),
    ];
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 14,
      crossAxisSpacing: 14,
      childAspectRatio: 1.55,
      children: cards,
    );
  }

  Widget _stat(String label, String value, IconData icon, Color fg, Color bg) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Lm.card, borderRadius: BorderRadius.circular(Lm.radius), boxShadow: Lm.cardShadow),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(fontSize: 12.5, color: Lm.muted)),
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(10)),
                child: Icon(icon, size: 16, color: fg),
              ),
            ],
          ),
          Text(value, style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w800, height: 1)),
        ],
      ),
    );
  }

  Widget _scanCta() {
    return Panel(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(color: Lm.skyBg, borderRadius: BorderRadius.circular(14)),
            child: const Icon(Icons.qr_code_scanner_rounded, color: Lm.primary),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(tr('dash.scanTitle'), style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(tr('dash.scanDesc'), style: const TextStyle(fontSize: 12, color: Lm.muted)),
              ],
            ),
          ),
          FilledButton(
            onPressed: widget.onScan,
            style: FilledButton.styleFrom(
              backgroundColor: Lm.primary,
              minimumSize: const Size(0, 44),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            child: Text(tr('nav.scan')),
          ),
        ],
      ),
    );
  }

  Widget _pill(String text, Color fg, Color bg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Text(text, style: TextStyle(fontSize: 11, color: fg, fontWeight: FontWeight.w700)),
    );
  }
}
