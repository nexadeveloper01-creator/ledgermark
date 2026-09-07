import 'package:flutter/material.dart';
import '../api.dart';
import '../theme.dart';
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
      if (mounted) _toast('출석 완료! +$awarded P · $streak주 연속');
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
      _toast('설문 참여 완료! +$awarded P');
      await _load();
    }
  }

  Future<void> _redeem(Map<String, dynamic> r) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(r['title'] as String),
        content: Text('${r['cost']} P를 사용해 신청하시겠어요?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('취소')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('사용')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      final res = await api.redeemReward(r['id'] as String);
      if (mounted) _toast('신청 완료! 잔액 ${res['balance']} P');
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

  Future<void> _useCoupon(Map<String, dynamic> c) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(c['label'] as String? ?? '쿠폰 사용'),
        content: Text('쿠폰(${c['code']})을 사용 처리할까요? 매장/결제 시 제시하세요.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('취소')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('사용')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await api.useCoupon(c['id'] as String);
      if (mounted) _toast('쿠폰을 사용 처리했습니다.');
      await _load();
    } catch (e) {
      if (mounted) _toast(e.toString());
    }
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
            _sectionTitle('내 쿠폰', '포인트로 받은 할인 혜택'),
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
          _sectionTitle('포인트 쌓기', '설문에 참여하고 포인트를 받으세요'),
          const SizedBox(height: 12),
          ..._surveys.map((s) => _surveyCard(s as Map<String, dynamic>)),
          const SizedBox(height: 20),
          _sectionTitle('포인트 사용', '경품 응모 · 콘텐츠 해금'),
          const SizedBox(height: 12),
          ...((_rewards?['rewards'] as List?) ?? []).map((r) => _rewardCard(r as Map<String, dynamic>)),
          const SizedBox(height: 20),
          _sectionTitle('적립 내역', null),
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
          const Text('내 포인트', style: TextStyle(color: Colors.white70, fontSize: 13)),
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
              Text('$_streak주 연속 출석', style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
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
                    : Text(_checkedIn ? '출석 완료' : '주간 출석'),
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
              const Expanded(
                child: Text('개인정보 동의 & 혜택', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
              ),
              TextButton(
                onPressed: _openConsent,
                style: TextButton.styleFrom(foregroundColor: Lm.primary, padding: const EdgeInsets.symmetric(horizontal: 8), minimumSize: const Size(0, 32)),
                child: const Text('동의 관리', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _benefitStat('동의로 받은 포인트', '$consent P', Lm.primary)),
              Container(width: 1, height: 34, color: Lm.line),
              Expanded(child: _benefitStat('보유 쿠폰', '$couponsActive장', Lm.violet)),
              Container(width: 1, height: 34, color: Lm.line),
              Expanded(child: _benefitStat('할인 혜택', discountLabel, Lm.good)),
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
      'USED' => ('사용완료', Lm.muted),
      'EXPIRED' => ('만료', Lm.muted),
      _ => ('사용 가능', Lm.good),
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
                  Text(c['label'] as String? ?? '할인 쿠폰', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 2),
                  Text(c['code'] as String? ?? '', style: const TextStyle(fontSize: 12, color: Lm.muted, fontFamily: 'monospace')),
                  const SizedBox(height: 2),
                  Text(statusLabel, style: TextStyle(fontSize: 11.5, color: statusColor, fontWeight: FontWeight.w700)),
                ],
              ),
            ),
            const SizedBox(width: 10),
            FilledButton(
              onPressed: usable ? () => _useCoupon(c) : null,
              style: FilledButton.styleFrom(
                backgroundColor: Lm.primary,
                disabledBackgroundColor: Lm.surface,
                minimumSize: const Size(0, 40),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('사용'),
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
                ? const Text('완료', style: TextStyle(color: Lm.good, fontWeight: FontWeight.w700, fontSize: 13))
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
              child: Text(soldOut ? '품절' : (affordable ? '신청' : '부족')),
            ),
          ],
        ),
      ),
    );
  }

  Widget _history() {
    final entries = (_summary?['entries'] as List?) ?? [];
    if (entries.isEmpty) {
      return const Panel(child: Text('아직 적립 내역이 없어요.', style: TextStyle(color: Lm.muted, fontSize: 13)));
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
    if (memo != null && memo.isNotEmpty) return memo;
    const m = {
      'SIGNUP_BONUS': '가입 축하',
      'DEVICE_REGISTRATION': '정품 등록',
      'WEEKLY_CHECKIN': '주간 출석',
      'STREAK_BONUS': '연속 출석 보너스',
      'SURVEY_COMPLETION': '설문 참여',
      'PROFILE_COMPLETION': '프로필 입력',
      'REWARD_REDEMPTION': '리워드 사용',
      'ADJUSTMENT': '조정',
    };
    return m[reason] ?? (reason ?? '');
  }
}
