import 'package:flutter/material.dart';
import '../api.dart';
import '../i18n.dart';
import '../theme.dart';

// 개인정보 수집·활용 동의 화면. 스코프별로 동의를 켜고 저장하면 최초 동의 시 보상 포인트가
// 지급된다. 언제든 철회(끄고 저장)할 수 있다. 동의 기반 데이터 활용의 상부상조 모델.
class ConsentScreen extends StatefulWidget {
  const ConsentScreen({super.key});

  @override
  State<ConsentScreen> createState() => _ConsentScreenState();
}

class _ConsentScreenState extends State<ConsentScreen> {
  static const _scopes = ['profile', 'usage', 'location', 'marketing'];
  final Map<String, bool> _on = {for (final s in _scopes) s: false};
  Map<String, dynamic> _points = {};
  List<dynamic> _rewarded = [];
  bool _loading = true, _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final c = await api.getConsent();
      if (!mounted) return;
      setState(() {
        final scopes = (c['scopes'] as Map?) ?? {};
        for (final s in _scopes) {
          _on[s] = scopes[s] == true;
        }
        _points = (c['scopePoints'] as Map?)?.cast<String, dynamic>() ?? {};
        _rewarded = (c['rewardedScopes'] as List?) ?? [];
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      final res = await api.setConsent(_on.map((k, v) => MapEntry(k, v)));
      final awarded = (res['awarded'] as num?)?.toInt() ?? 0;
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(awarded > 0 ? trp('consent.savedAwarded', {'p': '$awarded'}) : tr('consent.saved'))),
      );
      Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Lm.bg,
      appBar: AppBar(
        backgroundColor: Lm.bg,
        elevation: 0,
        foregroundColor: Lm.text,
        title: Text(tr('consent.title')),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Lm.primary))
          : ListView(
              padding: const EdgeInsets.fromLTRB(18, 6, 18, 40),
              children: [
                Panel(
                  color: Lm.skyBg,
                  child: Row(
                    children: [
                      const Icon(Icons.verified_user_rounded, color: Lm.primary),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(tr('consent.intro'),
                          style: const TextStyle(fontSize: 12.5, height: 1.45)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                for (final s in _scopes) _scopeTile(s),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: _saving ? null : _save,
                  child: _saving
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text(tr('consent.save')),
                ),
                const SizedBox(height: 10),
                Text(
                  tr('consent.footnote'),
                  style: const TextStyle(fontSize: 11, color: Lm.muted, height: 1.4),
                ),
              ],
            ),
    );
  }

  Widget _scopeTile(String s) {
    final label = tr('scope.$s');
    final pts = (_points[s] as num?)?.toInt() ?? 0;
    final rewarded = _rewarded.contains(s);
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Panel(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 2),
                  Text(
                    rewarded ? trp('consent.rewarded', {'p': '$pts'}) : trp('consent.grantPts', {'p': '$pts'}),
                    style: TextStyle(fontSize: 12, color: rewarded ? Lm.good : Lm.primary, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
            Switch(
              value: _on[s] ?? false,
              activeThumbColor: Lm.primary,
              onChanged: (v) => setState(() => _on[s] = v),
            ),
          ],
        ),
      ),
    );
  }
}
