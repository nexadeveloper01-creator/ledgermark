import 'package:flutter/material.dart';
import '../api.dart';
import '../theme.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../i18n.dart';
import 'widgets.dart';
import 'survey_screen.dart';
import 'consent_screen.dart';

// 포인트/혜택 허브: 잔액 · 주간 출석(스트릭) · 설문 참여 · 리워드 사용 · 적립 내역.
class RewardsTab extends StatefulWidget {
  final String consumerId;
  const RewardsTab({super.key, required this.consumerId});

  @override
  State<RewardsTab> createState() => _RewardsTabState();
}

class _RewardsTabState extends State<RewardsTab> {
  Map<String, dynamic>? _summary;
  List<dynamic> _surveys = [];
  Map<String, dynamic>? _rewards;
  Map<String, dynamic>? _benefits;
  List<dynamic> _coupons = [];
  bool _loading = true;
  bool _checkingIn = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait([
        api.pointsSummary(),
        api.surveys(),
        api.rewards(),
        api.benefits(),
        api.coupons(),
      ]);
      if (!mounted) return;
      setState(() {
        _summary = results[0] as Map<String, dynamic>;
        _surveys = results[1] as List<dynamic>;
        _rewards = results[2] as Map<String, dynamic>;
        _benefits = results[3] as Map<String, dynamic>;
        _coupons = results[4] as List<dynamic>;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  int get _balance => (_summary?['balance'] as num?)?.toInt() ?? 0;
  int get _streak => (_summary?['checkinStreak'] as num?)?.toInt() ?? 0;
  bool get _checkedIn => _summary?['checkedInThisWeek'] == true;

  Future<void> _checkin() async {
    setState(() => _checkingIn = true);
    try {
      final res = await api.checkin();
      final awarded = (res['awarded'] as num?)?.toInt() ?? 0;
      final streak = (res['streak'] as num?)?.toInt() ?? 0;
      if (mounted) _toast(trp('rewards.checkinDone', {'p': '$awarded', 'n': '$streak'}));
      await _load();
    } catch (e) {
      if (mounted) _toast(e.toString());
    } finally {
      if (mounted) setState(() => _checkingIn = false);
    }
  }

  Future<void> _openSurvey(Map<String, dynamic> s) async {
    final awarded = await Navigator.of(context).push<int>(
      MaterialPageRoute(builder: (_) => SurveyScreen(survey: s)),
    );
    if (awarded != null && awarded > 0 && mounted) {
      _toast(trp('rewards.surveyDone', {'p': '$awarded'}));
      await _load();
    }
  }

  Future<void> _redeem(Map<String, dynamic> r) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(r['title'] as String),
        content: Text(trp('rewards.redeemConfirm', {'p': '${r['cost']}'})),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(tr('common.cancel'))),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text(tr('rewards.use'))),
        ],
      ),
    );
    if (ok != true) return;
    try {
      final res = await api.redeemReward(r['id'] as String);
      if (mounted) _toast(trp('rewards.redeemDone', {'b': '${res['balance']}'}));
      await _load();
    } catch (e) {
      if (mounted) _toast(e.toString());
    }
  }

  Future<void> _openConsent() async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => const ConsentScreen()),
    );
    if (changed == true && mounted) await _load();
  }

  // 쿠폰 QR 제시 — 매장 POS가 이 QR을 스캔해 결제 시 차감한다.
  void _showCouponQr(Map<String, dynamic> c) {
    final code = c['code'] as String? ?? '';
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(width: 40, height: 4, decoration: BoxDecoration(color: Lm.line, borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 18),
            Text(c['label'] as String? ?? tr('coupons.title'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text(tr('coupons.qrTitle'), style: const TextStyle(fontSize: 13, color: Lm.muted)),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), boxShadow: Lm.cardShadow),
              child: QrImageView(
                data: code,
                version: QrVersions.auto,
                size: 220,
                eyeStyle: const QrEyeStyle(eyeShape: QrEyeShape.square, color: Lm.text),
                dataModuleStyle: const QrDataModuleStyle(dataModuleShape: QrDataModuleShape.square, color: Lm.text),
              ),
            ),
            const SizedBox(height: 16),
            Text(code, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, fontFamily: 'monospace', letterSpacing: 1)),
            const SizedBox(height: 6),
            Text(tr('coupons.qrNote'), style: const TextStyle(fontSize: 11, color: Lm.muted)),
          ],
        ),
      ),
    );
  }

  void _toast(String m) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: Lm.primary));
    }
    return RefreshIndicator(
      onRefresh: _load,
      color: Lm.primary,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(18, 12, 18, 120),
        children: [
          _balanceCard(),
          const SizedBox(height: 14),
          _benefitsCard(),
          if (_coupons.isNotEmpty) ...[
            const SizedBox(height: 20),
            _sectionTitle(tr('coupons.title'), tr('coupons.desc')),
            const SizedBox(height: 12),
            ..._coupons.map((c) => _couponCard(c as Map<String, dynamic>)),
          ],
          const SizedBox(height: 16),
          const AdSlot(
            assets: adCreatives,
            aspectRatio: 16 / 9,
            spec: '1080×608 · 16:9 · 랜덤 회전',
          ),
          const SizedBox(height: 20),
          _sectionTitle(tr('rewards.earnTitle'), tr('rewards.earnDesc')),
          const SizedBox(height: 12),
          ..._surveys.map((s) => _surveyCard(s as Map<String, dynamic>)),
          const SizedBox(height: 20),
          _sectionTitle(tr('rewards.useTitle'), tr('rewards.useDesc')),
          const SizedBox(height: 12),
          ...((_rewards?['rewards'] as List?) ?? []).map((r) => _rewardCard(r as Map<String, dynamic>)),
          const SizedBox(height: 20),
          _sectionTitle(tr('rewards.history'), null),
          const SizedBox(height: 12),
          _history(),
        ],
      ),
    );
  }

  Widget _balanceCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Lm.primary, Lm.violet],
        ),
        borderRadius: BorderRadius.circular(Lm.radius),
        boxShadow: Lm.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(tr('rewards.myPoints'), style: const TextStyle(color: Colors.white70, fontSize: 13)),
          const SizedBox(height: 6),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text('$_balance',
                  style: const TextStyle(color: Colors.white, fontSize: 40, fontWeight: FontWeight.w800, height: 1)),
              const SizedBox(width: 6),
              const Padding(
                padding: EdgeInsets.only(bottom: 6),
                child: Text('P', style: TextStyle(color: Colors.white70, fontSize: 18, fontWeight: FontWeight.w700)),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              const Icon(Icons.local_fire_department_rounded, color: Colors.amberAccent, size: 20),
              const SizedBox(width: 6),
              Text(trp('rewards.streak', {'n': '$_streak'}), style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
              const Spacer(),
              FilledButton(
                onPressed: (_checkedIn || _checkingIn) ? null : _checkin,
                style: FilledButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: Lm.primary,
                  disabledBackgroundColor: Colors.white24,
                  disabledForegroundColor: Colors.white70,
                  minimumSize: const Size(0, 40),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _checkingIn
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                    : Text(_checkedIn ? tr('rewards.checkedIn') : tr('rewards.checkin')),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _benefitsCard() {
    final consent = (_benefits?['consentPointsEarned'] as num?)?.toInt() ?? 0;
    final couponsActive = (_benefits?['couponsActive'] as num?)?.toInt() ?? 0;
    final pesos = (_benefits?['discountPesosTotal'] as num?)?.toInt() ?? 0;
    final pct = (_benefits?['discountPercentActive'] as num?)?.toInt() ?? 0;
    final discountLabel = pct > 0 && pesos > 0
        ? '$pct건 · ₱$pesos'
        : pct > 0
            ? '$pct건'
            : '₱$pesos';
    return Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.verified_user_rounded, color: Lm.primary, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(tr('benefits.title'), style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
              ),
              TextButton(
                onPressed: _openConsent,
                style: TextButton.styleFrom(foregroundColor: Lm.primary, padding: const EdgeInsets.symmetric(horizontal: 8), minimumSize: const Size(0, 32)),
                child: Text(tr('benefits.manage'), style: const TextStyle(fontWeight: FontWeight.w700)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _benefitStat(tr('benefits.consentPts'), '$consent P', Lm.primary)),
              Container(width: 1, height: 34, color: Lm.line),
              Expanded(child: _benefitStat(tr('benefits.coupons'), '$couponsActive${tr('benefits.couponsUnit')}', Lm.violet)),
              Container(width: 1, height: 34, color: Lm.line),
              Expanded(child: _benefitStat(tr('benefits.discount'), discountLabel, Lm.good)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _benefitStat(String label, String value, Color color) {
    return Column(
      children: [
        Text(value, style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: color)),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(fontSize: 11, color: Lm.muted), textAlign: TextAlign.center),
      ],
    );
  }

  Widget _couponCard(Map<String, dynamic> c) {
    final status = c['status'] as String? ?? 'ISSUED';
    final usable = status == 'ISSUED';
    final (statusLabel, statusColor) = switch (status) {
      'USED' => (tr('coupons.used'), Lm.muted),
      'EXPIRED' => (tr('coupons.expired'), Lm.muted),
      _ => (tr('coupons.usable'), Lm.good),
    };
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Panel(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(color: Lm.mintBg, borderRadius: BorderRadius.circular(14)),
              child: const Icon(Icons.local_offer_rounded, color: Lm.mint),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(c['label'] as String? ?? tr('coupons.title'), style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 2),
                  Text(c['code'] as String? ?? '', style: const TextStyle(fontSize: 12, color: Lm.muted, fontFamily: 'monospace')),
                  const SizedBox(height: 2),
                  Text(statusLabel, style: TextStyle(fontSize: 11.5, color: statusColor, fontWeight: FontWeight.w700)),
                ],
              ),
            ),
            const SizedBox(width: 10),
            FilledButton.icon(
              onPressed: usable ? () => _showCouponQr(c) : null,
              icon: const Icon(Icons.qr_code_2_rounded, size: 18),
              label: Text(tr('coupons.showQr')),
              style: FilledButton.styleFrom(
                backgroundColor: Lm.primary,
                disabledBackgroundColor: Lm.surface,
                minimumSize: const Size(0, 40),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionTitle(String ko, String? sub) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(ko, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
        if (sub != null) ...[
          const SizedBox(height: 2),
          Text(sub, style: const TextStyle(fontSize: 12.5, color: Lm.muted)),
        ],
      ],
    );
  }

  Widget _surveyCard(Map<String, dynamic> s) {
    final done = s['completed'] == true;
    final points = (s['points'] as num?)?.toInt() ?? 0;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Panel(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(color: done ? Lm.goodBg : Lm.violetBg, borderRadius: BorderRadius.circular(14)),
              child: Icon(done ? Icons.check_rounded : Icons.assignment_rounded,
                  color: done ? Lm.good : Lm.violet),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(s['title'] as String? ?? '', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 2),
                  Text(s['description'] as String? ?? '',
                      maxLines: 2, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, color: Lm.muted, height: 1.35)),
                ],
              ),
            ),
            const SizedBox(width: 10),
            done
                ? Text(tr('rewards.done'), style: const TextStyle(color: Lm.good, fontWeight: FontWeight.w700, fontSize: 13))
                : FilledButton(
                    onPressed: () => _openSurvey(s),
                    style: FilledButton.styleFrom(
                      backgroundColor: Lm.primary,
                      minimumSize: const Size(0, 40),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Text('+$points'),
                  ),
          ],
        ),
      ),
    );
  }

  Widget _rewardCard(Map<String, dynamic> r) {
    final cost = (r['cost'] as num?)?.toInt() ?? 0;
    final affordable = r['affordable'] == true;
    final soldOut = r['soldOut'] == true;
    final type = r['type'] as String? ?? 'GIFT';
    final (icon, bg, fg) = switch (type) {
      'CONTENT' => (Icons.lock_open_rounded, Lm.skyBg, Lm.sky),
      'PRIZE_DRAW' => (Icons.confirmation_num_rounded, Lm.peachBg, Lm.peach),
      'DISCOUNT' => (Icons.local_offer_rounded, Lm.goodBg, Lm.good),
      _ => (Icons.card_giftcard_rounded, Lm.mintBg, Lm.mint),
    };
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Panel(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(14)),
              child: Icon(icon, color: fg),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(r['title'] as String? ?? '', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 2),
                  Text(r['description'] as String? ?? '',
                      maxLines: 2, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, color: Lm.muted, height: 1.35)),
                  const SizedBox(height: 4),
                  Text('$cost P', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Lm.primary)),
                ],
              ),
            ),
            const SizedBox(width: 10),
            FilledButton(
              onPressed: (affordable && !soldOut) ? () => _redeem(r) : null,
              style: FilledButton.styleFrom(
                backgroundColor: Lm.primary,
                disabledBackgroundColor: Lm.surface,
                minimumSize: const Size(0, 40),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: Text(soldOut ? tr('rewards.soldOut') : (affordable ? tr('rewards.redeem') : tr('rewards.insufficient'))),
            ),
          ],
        ),
      ),
    );
  }

  Widget _history() {
    final entries = (_summary?['entries'] as List?) ?? [];
    if (entries.isEmpty) {
      return Panel(child: Text(tr('rewards.noHistory'), style: const TextStyle(color: Lm.muted, fontSize: 13)));
    }
    return Panel(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Column(
        children: [
          for (var i = 0; i < entries.length; i++)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                border: i == 0 ? null : const Border(top: BorderSide(color: Lm.line)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(_reasonLabel(entries[i]['reason'] as String?, entries[i]['memo'] as String?),
                        style: const TextStyle(fontSize: 13.5)),
                  ),
                  Text(
                    '${(entries[i]['amount'] as num) > 0 ? '+' : ''}${entries[i]['amount']}',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: (entries[i]['amount'] as num) > 0 ? Lm.good : Lm.warnFg,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  String _reasonLabel(String? reason, String? memo) {
    // memo(서버 생성 문자열)는 한국어일 수 있으나 원본 기록이므로 그대로 노출한다.
    if (memo != null && memo.isNotEmpty) return memo;
    if (reason == null) return '';
    const known = {
      'SIGNUP_BONUS', 'DEVICE_REGISTRATION', 'WEEKLY_CHECKIN', 'STREAK_BONUS',
      'SURVEY_COMPLETION', 'PROFILE_COMPLETION', 'CONSENT_REWARD', 'REWARD_REDEMPTION', 'ADJUSTMENT',
    };
    return known.contains(reason) ? tr('reason.$reason') : reason;
  }
}
