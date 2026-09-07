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

// 타겟 광고 슬롯. assets/ads/<asset> 파일(GIF/이미지)이 있으면 표시하고,
// 없으면 규격 안내 플레이스홀더를 렌더한다. 광고임을 항상 "AD" 라벨로 표시한다.
class AdSlot extends StatelessWidget {
  final String asset; // 예: 'ad_home.gif'
  final double aspectRatio; // 예: 16/6
  final String spec; // 플레이스홀더에 보여줄 권장 규격
  final VoidCallback? onTap;
  const AdSlot({
    super.key,
    required this.asset,
    required this.aspectRatio,
    required this.spec,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(Lm.radius),
        child: AspectRatio(
          aspectRatio: aspectRatio,
          child: Stack(
            fit: StackFit.expand,
            children: [
              Image.asset(
                'assets/ads/$asset',
                fit: BoxFit.cover,
                errorBuilder: (_, error, stack) => _placeholder(),
              ),
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.45),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text('AD',
                      style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w800, letterSpacing: 1)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _placeholder() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Lm.skyBg, Lm.violetBg],
        ),
      ),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle, boxShadow: Lm.cardShadow),
              child: const Icon(Icons.play_arrow_rounded, color: Lm.primary, size: 24),
            ),
            const SizedBox(height: 8),
            const Text('타겟 광고 영역', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Lm.text)),
            const SizedBox(height: 2),
            Text(spec, style: const TextStyle(fontSize: 10.5, color: Lm.muted)),
          ],
        ),
      ),
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
