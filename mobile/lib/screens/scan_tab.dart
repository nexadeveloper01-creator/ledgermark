import 'package:flutter/material.dart';
import '../api.dart';
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
    _code.text = code.trim();
    await _scan();
  }

  Future<void> _scan() async {
    if (_code.text.trim().isEmpty) return;
    setState(() {
      _busy = true;
      _error = null;
      _uid = null;
    });
    try {
      final uid = await api.lookupUid(_code.text.trim());
      setState(() => _uid = uid);
    } on ApiException {
      setState(() => _error = '원장에 존재하지 않는 UID입니다. 위조품일 수 있습니다.');
    } catch (_) {
      setState(() => _error = '조회에 실패했습니다.');
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
        const SectionHeader(
          en: 'STEP 01 — SCAN',
          ko: 'UID 스캔',
          desc: '제품 하단 코드를 입력하면 원장에서 즉시 조회됩니다.',
        ),
        const SizedBox(height: 20),
        const Text('UID 코드', style: TextStyle(fontSize: 12, color: Lm.muted)),
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
          label: const Text('카메라로 스캔 / SCAN QR'),
        ),
        const SizedBox(height: 8),
        OutlinedButton(onPressed: _busy ? null : _scan, child: const Text('코드로 조회 / LOOKUP')),
        if (_error != null) ...[const SizedBox(height: 16), Warn(_error!)],
        if (uid != null) ...[
          const SizedBox(height: 20),
          Figure(
            label: 'SCANNED UID',
            value: uid['code'] as String,
            note: uid['status'] == 'WHOLESALE' ? '원장 일치 · 정품 확인' : '원장 일치 · 상태 확인 필요',
          ),
          const SizedBox(height: 12),
          KvRow('제품', uid['lot']?['productName']?.toString() ?? '—'),
          KvRow('LOT', uid['lot']?['code']?.toString() ?? '—'),
          KvRow('현재 상태', statusLabel(uid['status'] as String)),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: () => setState(() {
              _step = _Step.verify;
              _error = null;
            }),
            child: const Text('연령인증으로 / CONTINUE'),
          ),
        ],
      ],
    );
  }

  Widget _verifyView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SectionHeader(
          en: 'STEP 02 — AGE VERIFICATION',
          ko: '연령인증',
          desc: 'RA 11900 요건에 따라 정부발급 ID 스캔과 Liveness 검사를 수행합니다.',
        ),
        const SizedBox(height: 20),
        const Figure(
          label: 'AVP MODULE',
          value: 'PH · GOV-ID + LIVENESS',
          note: '등록국가 판별 → 필리핀 모듈 호출',
        ),
        const SizedBox(height: 16),
        const Text('생년월일 (YYYY-MM-DD)', style: TextStyle(fontSize: 12, color: Lm.muted)),
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
          title: const Text('정부발급 ID 스캔 완료', style: TextStyle(fontSize: 14)),
        ),
        CheckboxListTile(
          contentPadding: EdgeInsets.zero,
          controlAffinity: ListTileControlAffinity.leading,
          dense: true,
          activeColor: Lm.accent,
          value: _liveness,
          onChanged: (v) => setState(() => _liveness = v ?? false),
          title: const Text('Liveness 검사 통과', style: TextStyle(fontSize: 14)),
        ),
        const KvRow('원장 기록', '검증완료 여부·시각·방식'),
        const KvRow('신분정보 원본', '저장하지 않음'),
        if (_verified != null) KvRow('검증 결과', _verified! ? '통과' : '실패'),
        const SizedBox(height: 16),
        if (_error != null) ...[Warn(_error!), const SizedBox(height: 12)],
        if (_verified == false && _reasons != null) ...[
          Warn(_reasons!.join(' ')),
          const SizedBox(height: 12),
        ],
        if (!widget.emailVerified) ...[
          const Warn('이메일 인증을 완료해야 정품 등록을 신청할 수 있습니다.'),
          const SizedBox(height: 12),
        ],
        if (_verified == true)
          ElevatedButton(
            onPressed: _busy ? null : _register,
            child: const Text('정품 등록 신청 / REGISTER'),
          )
        else
          ElevatedButton(
            onPressed: _busy ? null : _verify,
            child: const Text('인증 완료 / VERIFY'),
          ),
        const SizedBox(height: 8),
        TextButton(
          onPressed: () => setState(() => _step = _Step.scan),
          child: const Text('← 스캔으로 돌아가기', style: TextStyle(color: Lm.accent700)),
        ),
      ],
    );
  }
}
