import 'package:flutter/material.dart';
import '../api.dart';
import '../theme.dart';
import 'widgets.dart';

class ProductsTab extends StatefulWidget {
  final String consumerId;
  const ProductsTab({super.key, required this.consumerId});

  @override
  State<ProductsTab> createState() => _ProductsTabState();
}

class _ProductsTabState extends State<ProductsTab> {
  List<dynamic> _uids = [];
  bool _loading = true;
  String? _error;
  String? _message;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await api.myUids(widget.consumerId);
      setState(() => _uids = list);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _exchange(String code) async {
    setState(() {
      _error = null;
      _message = null;
    });
    try {
      await api.requestExchange(code);
      setState(() => _message = '교환 신청이 접수되었습니다. 매장 AS 검수 후 처리됩니다.');
      _load();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  Future<void> _resell(String code) async {
    final email = await _askEmail();
    if (email == null || email.trim().isEmpty) return;
    setState(() {
      _error = null;
      _message = null;
    });
    try {
      final target = await api.lookupConsumer(email.trim());
      await api.resell(code, widget.consumerId, target['id'] as String);
      setState(() =>
          _message = '${target['displayName']}님에게 양도되었습니다. 교환권은 재발급되지 않습니다.');
      _load();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  Future<String?> _askEmail() {
    final c = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Lm.bg,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
        title: const Text('중고거래 양수인', style: TextStyle(fontSize: 18)),
        content: TextField(
          controller: c,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(labelText: '양수인 이메일', hintText: 'buyer@example.com'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('취소')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, c.text),
            style: ElevatedButton.styleFrom(minimumSize: const Size(80, 40)),
            child: const Text('양도'),
          ),
        ],
      ),
    );
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
            en: 'STEP 04 — MY PRODUCTS',
            ko: '내 제품',
            desc: '보유 중인 제품의 교환권 상태를 확인하고 교환·중고거래를 신청합니다.',
          ),
          const SizedBox(height: 20),
          if (_message != null) ...[Warn(_message!), const SizedBox(height: 12)],
          if (_error != null) ...[Warn(_error!), const SizedBox(height: 12)],
          if (_uids.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Text('보유한 제품이 없습니다.', style: TextStyle(color: Lm.muted)),
            ),
          for (final u in _uids) ...[
            _card(u as Map<String, dynamic>),
            const SizedBox(height: 14),
          ],
          const SizedBox(height: 6),
          const AdSlot(
            assets: ['ad_ecig.gif', 'ad_alcohol.gif'],
            aspectRatio: 16 / 9,
            spec: '1080×608 · 16:9 · 랜덤 회전',
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _card(Map<String, dynamic> u) {
    final code = u['code'] as String;
    final voucher = u['voucherState'] as String? ?? 'NONE';
    final canExchange = voucher == 'AVAILABLE';
    return Blueprint(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(code, style: const TextStyle(fontFamily: 'monospace', fontSize: 12)),
          const SizedBox(height: 6),
          Text('${u['lot']?['productName'] ?? ''} · 교환권 $voucher',
              style: const TextStyle(fontSize: 12, color: Lm.muted)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: canExchange ? () => _exchange(code) : null,
                  style: OutlinedButton.styleFrom(minimumSize: const Size(0, 38)),
                  child: const Text('교환 신청', style: TextStyle(fontSize: 12)),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(
                  onPressed: () => _resell(code),
                  style: OutlinedButton.styleFrom(minimumSize: const Size(0, 38)),
                  child: const Text('중고거래 등록', style: TextStyle(fontSize: 12)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
