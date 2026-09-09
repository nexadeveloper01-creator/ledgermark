import 'package:flutter/material.dart';
import '../api.dart';
import '../i18n.dart';
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
  Map<String, dynamic>? _entitlement;
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
      Map<String, dynamic>? ent;
      try {
        ent = await api.exchangeEntitlement();
      } catch (_) {}
      setState(() {
        _uids = list;
        _entitlement = ent;
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _activateBonus(String code) async {
    setState(() {
      _error = null;
      _message = null;
    });
    try {
      await api.applyExchangeBonus(code);
      setState(() => _message = tr('products.bonusDone'));
      _load();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  Future<void> _exchange(String code) async {
    setState(() {
      _error = null;
      _message = null;
    });
    try {
      await api.requestExchange(code);
      setState(() => _message = tr('products.exchanged'));
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
          _message = i18n.code == 'ko'
              ? '${target['displayName']}님에게 양도되었습니다. 교환권은 재발급되지 않습니다.'
              : 'Transferred to ${target['displayName']}. The voucher is not reissued.');
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
        title: Text(tr('products.resellTitle'), style: const TextStyle(fontSize: 18)),
        content: TextField(
          controller: c,
          keyboardType: TextInputType.emailAddress,
          decoration: InputDecoration(labelText: tr('products.resellAsk'), hintText: 'buyer@example.com'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(tr('common.cancel'))),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, c.text),
            style: ElevatedButton.styleFrom(minimumSize: const Size(80, 40)),
            child: Text(tr('products.resellCta')),
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
          SectionHeader(
            en: 'STEP 04 — MY PRODUCTS',
            ko: tr('products.title'),
            desc: tr('products.desc'),
          ),
          const SizedBox(height: 20),
          _exchangeBanner(),
          const SizedBox(height: 16),
          if (_message != null) ...[Warn(_message!), const SizedBox(height: 12)],
          if (_error != null) ...[Warn(_error!), const SizedBox(height: 12)],
          if (_uids.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Text(tr('products.none'), style: const TextStyle(color: Lm.muted)),
            ),
          for (final u in _uids) ...[
            _card(u as Map<String, dynamic>),
            const SizedBox(height: 14),
          ],
          const SizedBox(height: 6),
          const AdSlot(
            assets: adCreatives,
            aspectRatio: 16 / 9,
            spec: '1080×608 · 16:9 · 랜덤 회전',
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _exchangeBanner() {
    final e = _entitlement;
    final qualified = e?['qualified'] == true;
    final remaining = (e?['bonusRemaining'] as num?)?.toInt() ?? 0;
    final missing = (e?['missing'] as List?)?.cast<String>() ?? [];
    return Blueprint(
      padding: const EdgeInsets.all(14),
      background: qualified ? Lm.accent100 : Colors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.autorenew_rounded, size: 18, color: Lm.accent),
              const SizedBox(width: 8),
              Text(tr('products.exchangeTitle'), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
            ],
          ),
          const SizedBox(height: 8),
          Text(tr('products.exchangeBase'),
              style: const TextStyle(fontSize: 12, color: Lm.muted, height: 1.5)),
          const SizedBox(height: 4),
          Text(
            qualified
                ? trp('products.bonusOpen', {'n': '$remaining'})
                : tr('products.bonusLocked'),
            style: TextStyle(fontSize: 12, height: 1.5, color: qualified ? Lm.accent900 : Lm.text),
          ),
          if (!qualified && missing.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text('· ${missing.join('\n· ')}', style: const TextStyle(fontSize: 11, color: Lm.muted, height: 1.6)),
          ],
        ],
      ),
    );
  }

  Widget _card(Map<String, dynamic> u) {
    final code = u['code'] as String;
    final voucher = u['voucherState'] as String? ?? 'NONE';
    final canExchange = voucher == 'AVAILABLE';
    final qualified = _entitlement?['qualified'] == true;
    final bonusRemaining = (_entitlement?['bonusRemaining'] as num?)?.toInt() ?? 0;
    // 교환권을 소진(NONE)한 기기 + 추가 자격 보유 → 추가 교환 활성화 가능(중고 VOID 제외).
    final canActivateBonus = voucher == 'NONE' && qualified && bonusRemaining > 0;
    return Blueprint(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(maskUid(code), style: const TextStyle(fontFamily: 'monospace', fontSize: 12)),
          const SizedBox(height: 6),
          Text('${u['lot']?['productName'] ?? ''} · ${tr('products.voucher')} $voucher${voucher == 'AVAILABLE' ? voucherExpiryText(u['voucherExpiresAt'] as String?) : ''}',
              style: const TextStyle(fontSize: 12, color: Lm.muted)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: canExchange ? () => _exchange(code) : null,
                  style: OutlinedButton.styleFrom(minimumSize: const Size(0, 38)),
                  child: Text(tr('products.exchange'), style: const TextStyle(fontSize: 12)),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(
                  onPressed: () => _resell(code),
                  style: OutlinedButton.styleFrom(minimumSize: const Size(0, 38)),
                  child: Text(tr('products.resell'), style: const TextStyle(fontSize: 12)),
                ),
              ),
            ],
          ),
          if (canActivateBonus) ...[
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () => _activateBonus(code),
                style: FilledButton.styleFrom(
                  backgroundColor: Lm.primary,
                  minimumSize: const Size(0, 38),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: Text(tr('products.activateBonus'), style: const TextStyle(fontSize: 12)),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
