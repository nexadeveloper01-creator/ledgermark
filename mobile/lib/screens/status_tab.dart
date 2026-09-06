import 'package:flutter/material.dart';
import '../api.dart';
import '../theme.dart';
import 'widgets.dart';

class StatusTab extends StatefulWidget {
  final String consumerId;
  final String? highlightRequestId;
  const StatusTab({super.key, required this.consumerId, this.highlightRequestId});

  @override
  State<StatusTab> createState() => _StatusTabState();
}

class _StatusTabState extends State<StatusTab> {
  List<dynamic> _requests = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(StatusTab old) {
    super.didUpdateWidget(old);
    if (old.highlightRequestId != widget.highlightRequestId) _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await api.myRequests(widget.consumerId);
      setState(() => _requests = list);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _label(String s) {
    const m = {
      'PENDING': '매장 승인 대기',
      'COMMITTED': '정품 등록 완료',
      'BLOCKED': '판매 차단됨',
      'REJECTED': '매장에서 반려됨',
    };
    return m[s] ?? s;
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const SectionHeader(
            en: 'STEP 03 — REGISTRATION',
            ko: '정품 등록 상태',
            desc: '신청한 정품 등록의 진행 상태를 확인합니다. 매장이 소유권 이전을 커밋하면 완료됩니다.',
          ),
          const SizedBox(height: 20),
          if (_error != null) Warn(_error!),
          if (_requests.isEmpty && _error == null)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Text('아직 등록 신청 이력이 없습니다.', style: TextStyle(color: Lm.muted)),
            ),
          for (final r in _requests) ...[
            _card(r as Map<String, dynamic>),
            const SizedBox(height: 16),
          ],
        ],
      ),
    );
  }

  Widget _card(Map<String, dynamic> r) {
    final uid = r['uid'] as Map<String, dynamic>?;
    final status = r['status'] as String;
    final committed = status == 'COMMITTED';
    final highlight = r['id'] == widget.highlightRequestId;
    return Blueprint(
      padding: const EdgeInsets.all(16),
      background: highlight ? Lm.accent100.withValues(alpha: 0.4) : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Tag(_label(status), strong: committed || status == 'BLOCKED'),
              const Spacer(),
              Text(r['type']?.toString() ?? '',
                  style: const TextStyle(fontSize: 11, color: Lm.accent700)),
            ],
          ),
          const SizedBox(height: 10),
          Text(uid?['code']?.toString() ?? '',
              style: const TextStyle(fontFamily: 'monospace', fontSize: 13)),
          KvRow('제품', uid?['lot']?['productName']?.toString() ?? '—'),
          KvRow('연령인증', r['ageVerified'] == true ? '완료 (RA 11900)' : '미완료'),
          if (committed)
            KvRow('교환권', uid?['voucherState'] == 'AVAILABLE' ? '유효 · 불량/색상 교환 1회' : (uid?['voucherState']?.toString() ?? '—')),
          if (status == 'BLOCKED' && r['blockedReason'] != null) ...[
            const SizedBox(height: 10),
            Warn(r['blockedReason'] as String),
          ],
        ],
      ),
    );
  }
}
