import 'package:flutter/material.dart';
import '../api.dart';
import '../i18n.dart';
import '../theme.dart';
import 'widgets.dart';
import 'qr_scanner.dart';

// UID 스캔 → 연령인증 → 정품 등록 신청까지 한 탭에서 진행한다.
class ScanTab extends StatefulWidget {
  final String consumerId;
  final bool emailVerified;
  final void Function(String requestId) onRegistered;
  const ScanTab({
    super.key,
    required this.consumerId,
    required this.emailVerified,
    required this.onRegistered,
  });

  @override
  State<ScanTab> createState() => _ScanTabState();
}

enum _Step { scan, verify }

class _ScanTabState extends State<ScanTab> {
  _Step _step = _Step.scan;
  final _code = TextEditingController();
  Map<String, dynamic>? _uid;
  String? _error;
  bool _busy = false;

  // 연령인증 입력
  final _birth = TextEditingController(text: '2000-01-01');
  bool _idScanned = true;
  bool _liveness = true;
  bool? _verified;
  List<String>? _reasons;

  @override
  void dispose() {
    _code.dispose();
    _birth.dispose();
    super.dispose();
  }

  Future<void> _openCamera() async {
    final code = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const QrScannerScreen(), fullscreenDialog: true),
    );
    if (code == null || code.trim().isEmpty) return;
    final v = code.trim();
    // 자판기 클레임 QR이면 소유권 자동 이전으로 분기한다.
    if (v.toUpperCase().startsWith('LMK-')) {
      await _claimKiosk(v);
      return;
    }
    _code.text = v;
    await _scan();
  }

  // 자판기에서 배출된 제품의 클레임 코드 → 소유권 자동 이전(정품 등록·포인트 적립).
  Future<void> _claimKiosk(String claimCode) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final res = await api.claimKiosk(claimCode.trim());
      if (!mounted) return;
      final product = res['productName']?.toString() ?? tr('scan.product');
      final awarded = (res['awarded'] as num?)?.toInt() ?? 0;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(trp('scan.claimDone', {'p': product, 'pt': '$awarded'}))),
      );
      Navigator.of(context).pop(); // 홈으로 복귀 → 데이터 새로고침
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _scan() async {
    if (_code.text.trim().isEmpty) return;
    // 클레임 코드를 코드 입력창에 직접 넣은 경우도 처리.
    if (_code.text.trim().toUpperCase().startsWith('LMK-')) {
      await _claimKiosk(_code.text.trim());
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _uid = null;
    });
    try {
      final uid = await api.lookupUid(_code.text.trim());
      setState(() => _uid = uid);
    } on ApiException {
      setState(() => _error = tr('scan.notFound'));
    } catch (_) {
      setState(() => _error = tr('scan.lookupFail'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verify() async {
    setState(() {
      _busy = true;
      _error = null;
      _reasons = null;
    });
    try {
      final res = await api.verifyAge(widget.consumerId, {
        'idScanned': _idScanned,
        'livenessPassed': _liveness,
        'birthDate': _birth.text.trim(),
      });
      setState(() {
        _verified = res['verification']?['verified'] == true;
        _reasons = (res['reasons'] as List?)?.map((e) => e.toString()).toList();
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _register() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final req = await api.requestRegistration(_uid!['code'] as String);
      widget.onRegistered(req['id'] as String);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 460),
          child: _step == _Step.scan ? _scanView() : _verifyView(),
        ),
      ),
    );
  }

  Widget _scanView() {
    final uid = _uid;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(
          en: 'STEP 01 — SCAN',
          ko: tr('scan.title'),
          desc: tr('scan.desc'),
        ),
        const SizedBox(height: 20),
        Text(tr('scan.uidCode'), style: const TextStyle(fontSize: 12, color: Lm.muted)),
        const SizedBox(height: 5),
        TextField(
          controller: _code,
          decoration: const InputDecoration(hintText: 'PH-2609-A-000010'),
          onSubmitted: (_) => _scan(),
        ),
        const SizedBox(height: 12),
        ElevatedButton.icon(
          onPressed: _busy ? null : _openCamera,
          icon: const Icon(Icons.qr_code_scanner, size: 18),
          label: Text(tr('scan.camera')),
        ),
        const SizedBox(height: 8),
        OutlinedButton(onPressed: _busy ? null : _scan, child: Text(tr('scan.lookup'))),
        if (_error != null) ...[const SizedBox(height: 16), Warn(_error!)],
        if (uid != null) ...[
          const SizedBox(height: 20),
          Figure(
            label: 'SCANNED UID',
            value: uid['code'] as String,
            note: uid['status'] == 'WHOLESALE' ? tr('scan.genuine') : tr('scan.checkStatus'),
          ),
          const SizedBox(height: 12),
          KvRow(tr('scan.product'), uid['lot']?['productName']?.toString() ?? '—'),
          KvRow('LOT', uid['lot']?['code']?.toString() ?? '—'),
          KvRow(tr('scan.status'), statusLabel(uid['status'] as String)),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: () => setState(() {
              _step = _Step.verify;
              _error = null;
            }),
            child: Text(tr('scan.continue')),
          ),
        ],
      ],
    );
  }

  Widget _verifyView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(
          en: 'STEP 02 — AGE VERIFICATION',
          ko: tr('scan.ageTitle'),
          desc: tr('scan.ageDesc'),
        ),
        const SizedBox(height: 20),
        const Figure(
          label: 'AVP MODULE',
          value: 'PH · GOV-ID + LIVENESS',
          note: '등록국가 판별 → 필리핀 모듈 호출',
        ),
        const SizedBox(height: 16),
        Text(tr('scan.birth'), style: const TextStyle(fontSize: 12, color: Lm.muted)),
        const SizedBox(height: 5),
        TextField(controller: _birth),
        const SizedBox(height: 8),
        CheckboxListTile(
          contentPadding: EdgeInsets.zero,
          controlAffinity: ListTileControlAffinity.leading,
          dense: true,
          activeColor: Lm.accent,
          value: _idScanned,
          onChanged: (v) => setState(() => _idScanned = v ?? false),
          title: Text(tr('scan.idScanned'), style: const TextStyle(fontSize: 14)),
        ),
        CheckboxListTile(
          contentPadding: EdgeInsets.zero,
          controlAffinity: ListTileControlAffinity.leading,
          dense: true,
          activeColor: Lm.accent,
          value: _liveness,
          onChanged: (v) => setState(() => _liveness = v ?? false),
          title: Text(tr('scan.liveness'), style: const TextStyle(fontSize: 14)),
        ),
        const KvRow('원장 기록', '검증완료 여부·시각·방식'),
        const KvRow('신분정보 원본', '저장하지 않음'),
        if (_verified != null) KvRow(tr('scan.verifyResult'), _verified! ? tr('scan.pass') : tr('scan.fail')),
        const SizedBox(height: 16),
        if (_error != null) ...[Warn(_error!), const SizedBox(height: 12)],
        if (_verified == false && _reasons != null) ...[
          Warn(_reasons!.join(' ')),
          const SizedBox(height: 12),
        ],
        if (!widget.emailVerified) ...[
          Warn(tr('scan.needEmail')),
          const SizedBox(height: 12),
        ],
        if (_verified == true)
          ElevatedButton(
            onPressed: _busy ? null : _register,
            child: Text(tr('scan.register')),
          )
        else
          ElevatedButton(
            onPressed: _busy ? null : _verify,
            child: Text(tr('scan.verify')),
          ),
        const SizedBox(height: 8),
        TextButton(
          onPressed: () => setState(() => _step = _Step.scan),
          child: Text(tr('scan.backToScan'), style: const TextStyle(color: Lm.accent700)),
        ),
      ],
    );
  }
}
