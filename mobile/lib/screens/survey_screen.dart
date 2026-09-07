import 'package:flutter/material.dart';
import '../api.dart';
import '../i18n.dart';
import '../theme.dart';

// 설문 응답 화면. 질문 유형(single/multi/scale/text)에 맞춰 입력을 받고 제출하면
// 서버가 최초 1회 포인트를 적립한다. 성공 시 적립 포인트를 결과로 pop 한다.
class SurveyScreen extends StatefulWidget {
  final Map<String, dynamic> survey;
  const SurveyScreen({super.key, required this.survey});

  @override
  State<SurveyScreen> createState() => _SurveyScreenState();
}

class _SurveyScreenState extends State<SurveyScreen> {
  final Map<String, dynamic> _answers = {};
  bool _submitting = false;
  String? _error;

  List<dynamic> get _questions => (widget.survey['questions'] as List?) ?? [];

  bool get _complete {
    for (final q in _questions) {
      final id = q['id'] as String;
      final type = q['type'] as String;
      if (type == 'text') continue; // 자유응답은 선택
      final a = _answers[id];
      if (a == null) return false;
      if (type == 'multi' && (a as List).isEmpty) return false;
    }
    return true;
  }

  Future<void> _submit() async {
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final res = await api.respondSurvey(widget.survey['id'] as String, _answers);
      if (!mounted) return;
      Navigator.of(context).pop((res['awarded'] as num?)?.toInt() ?? 0);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final points = (widget.survey['points'] as num?)?.toInt() ?? 0;
    return Scaffold(
      backgroundColor: Lm.bg,
      appBar: AppBar(
        backgroundColor: Lm.bg,
        elevation: 0,
        foregroundColor: Lm.text,
        title: Text(widget.survey['title'] as String? ?? (i18n.code == 'ko' ? '설문' : 'Survey')),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(18, 6, 18, 40),
        children: [
          Panel(
            color: Lm.skyBg,
            child: Row(
              children: [
                const Icon(Icons.stars_rounded, color: Lm.primary),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(widget.survey['description'] as String? ?? '',
                      style: const TextStyle(fontSize: 13, height: 1.4)),
                ),
                const SizedBox(width: 8),
                Text('+$points P',
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Lm.primary)),
              ],
            ),
          ),
          const SizedBox(height: 16),
          for (var i = 0; i < _questions.length; i++) _questionCard(i, _questions[i]),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: const TextStyle(color: Lm.warnFg, fontSize: 12.5)),
          ],
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: (_complete && !_submitting) ? _submit : null,
            child: _submitting
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text(trp('survey.submit', {'p': '$points'})),
          ),
        ],
      ),
    );
  }

  Widget _questionCard(int idx, dynamic q) {
    final id = q['id'] as String;
    final type = q['type'] as String;
    final options = (q['options'] as List?)?.cast<String>() ?? [];
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      child: Panel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${idx + 1}. ${q['text']}',
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, height: 1.4)),
            const SizedBox(height: 12),
            if (type == 'single') _single(id, options),
            if (type == 'multi') _multi(id, options),
            if (type == 'scale') _scale(id, options),
            if (type == 'text') _text(id),
          ],
        ),
      ),
    );
  }

  Widget _single(String id, List<String> options) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final o in options)
          _choice(o, _answers[id] == o, () => setState(() => _answers[id] = o)),
      ],
    );
  }

  Widget _multi(String id, List<String> options) {
    final selected = (_answers[id] as List?)?.cast<String>() ?? [];
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final o in options)
          _choice(o, selected.contains(o), () {
            setState(() {
              final list = List<String>.from(selected);
              list.contains(o) ? list.remove(o) : list.add(o);
              _answers[id] = list;
            });
          }),
      ],
    );
  }

  Widget _scale(String id, List<String> options) {
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: [
        for (final o in options)
          GestureDetector(
            onTap: () => setState(() => _answers[id] = o),
            child: Container(
              width: 38,
              height: 38,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: _answers[id] == o ? Lm.primary : Lm.surface,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(o,
                  style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: _answers[id] == o ? Colors.white : Lm.text)),
            ),
          ),
      ],
    );
  }

  Widget _text(String id) {
    return TextField(
      maxLines: 3,
      decoration: InputDecoration(hintText: tr('survey.freeText')),
      onChanged: (v) => _answers[id] = v,
    );
  }

  Widget _choice(String label, bool selected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? Lm.primary : Lm.surface,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(label,
            style: TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w600,
                color: selected ? Colors.white : Lm.text)),
      ),
    );
  }
}
