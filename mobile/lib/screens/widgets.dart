import 'package:flutter/material.dart';
import '../theme.dart';

class SectionHeader extends StatelessWidget {
  final String en;
  final String ko;
  final String? desc;
  const SectionHeader({super.key, required this.en, required this.ko, this.desc});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(en, style: const TextStyle(fontSize: 10, letterSpacing: 2, color: Lm.accent700)),
        const SizedBox(height: 6),
        Text(ko, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
        if (desc != null) ...[
          const SizedBox(height: 8),
          Text(desc!, style: const TextStyle(fontSize: 13, color: Lm.muted, height: 1.55)),
        ],
      ],
    );
  }
}

class KvRow extends StatelessWidget {
  final String k;
  final String v;
  const KvRow(this.k, this.v, {super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 9),
      decoration: const BoxDecoration(border: Border(top: BorderSide(color: Lm.divider))),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: Text(k, style: const TextStyle(fontSize: 13, color: Lm.muted))),
          const SizedBox(width: 12),
          Expanded(
            child: Text(v,
                textAlign: TextAlign.right, style: const TextStyle(fontSize: 13)),
          ),
        ],
      ),
    );
  }
}

class Figure extends StatelessWidget {
  final String label;
  final String value;
  final String? note;
  const Figure({super.key, required this.label, required this.value, this.note});

  @override
  Widget build(BuildContext context) {
    return Blueprint(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 10, letterSpacing: 1.6, color: Lm.muted)),
          const SizedBox(height: 8),
          Text(value,
              style: const TextStyle(
                  fontSize: 16, fontFamily: 'monospace', fontWeight: FontWeight.w600)),
          if (note != null) ...[
            const SizedBox(height: 8),
            Text(note!, style: const TextStyle(fontSize: 12, height: 1.5)),
          ],
        ],
      ),
    );
  }
}

class Warn extends StatelessWidget {
  final String text;
  const Warn(this.text, {super.key});
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(color: Lm.accent100, border: Border.all(color: Lm.accent400)),
      child: Text(text, style: const TextStyle(fontSize: 12, color: Lm.accent900, height: 1.55)),
    );
  }
}

class Tag extends StatelessWidget {
  final String text;
  final bool strong;
  const Tag(this.text, {super.key, this.strong = false});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      color: strong ? Lm.accent100 : Lm.surface,
      child: Text(text,
          style: TextStyle(fontSize: 11, color: strong ? Lm.accent900 : Lm.text)),
    );
  }
}

String statusLabel(String s) {
  const m = {
    'MINTED': '발급됨',
    'EXPORTED': '수출됨',
    'WHOLESALE': '총판 배분',
    'RETAIL_SOLD': '소비자 판매',
    'EXCHANGED': '교환됨',
    'RESOLD': '중고 거래됨',
  };
  return m[s] ?? s;
}
