import 'dart:async';
import 'dart:math';
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

// 하드코딩 광고 소재 풀 (외부 광고 연동 전까지 사용).
// assets/ads/ 에 아래 파일명으로 넣으면 모든 슬롯이 이 4개를 랜덤 회전한다.
//   ad_ecig.gif      전자담배(정품 인증) 디바이스
//   ad_beer.gif      맥주(루프탑 건배)
//   ad_whiskey1.gif  위스키(따르는 컷)
//   ad_whiskey2.gif  위스키(아이스볼 클로즈업)
const List<String> adCreatives = [
  'ad_ecig.gif',
  'ad_beer.gif',
  'ad_whiskey1.gif',
  'ad_whiskey2.gif',
];

// 타겟 광고 슬롯. 여러 소재(assets/ads/<파일>)를 후보로 받아 랜덤 시작 + 일정 간격
// 크로스페이드로 회전 표시한다. 슬롯마다 시작 인덱스가 랜덤이라 화면의 두 슬롯이
// 동시에 서로 다른 광고(예: 전자담배 / 술)를 돌린다. 소재가 없으면 규격 안내
// 플레이스홀더를 렌더하고, 광고임을 항상 "AD" 라벨로 표시한다.
class AdSlot extends StatefulWidget {
  final List<String> assets; // 후보 소재 파일명들 (예: ['ad_ecig.gif','ad_alcohol.gif'])
  final double aspectRatio; // 예: 16/9
  final String spec; // 플레이스홀더 안내 규격
  final Duration interval; // 회전 간격
  final VoidCallback? onTap;
  const AdSlot({
    super.key,
    required this.assets,
    this.aspectRatio = 16 / 9,
    required this.spec,
    this.interval = const Duration(seconds: 6),
    this.onTap,
  });

  @override
  State<AdSlot> createState() => _AdSlotState();
}

class _AdSlotState extends State<AdSlot> {
  final _rnd = Random();
  int _i = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    final n = widget.assets.length;
    if (n > 0) _i = _rnd.nextInt(n); // 랜덤 시작 → 슬롯마다 다른 소재부터
    if (n > 1) {
      _timer = Timer.periodic(widget.interval, (_) {
        if (mounted) setState(() => _i = _nextIndex());
      });
    }
  }

  // 직전과 중복되지 않는 랜덤 인덱스를 고른다.
  int _nextIndex() {
    final n = widget.assets.length;
    if (n <= 1) return 0;
    int next;
    do {
      next = _rnd.nextInt(n);
    } while (next == _i);
    return next;
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final assets = widget.assets;
    return GestureDetector(
      onTap: widget.onTap,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(Lm.radius),
        child: AspectRatio(
          aspectRatio: widget.aspectRatio,
          child: Stack(
            fit: StackFit.expand,
            children: [
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 450),
                // AnimatedSwitcher는 자식에 확장 제약을 주지 않으므로 SizedBox.expand로
                // 감싸 슬롯을 꽉 채우게 한다. 키는 확장 박스에 두어 크로스페이드를 트리거.
                child: SizedBox.expand(
                  key: ValueKey(assets.isEmpty ? '_placeholder' : assets[_i]),
                  child: assets.isEmpty
                      ? _placeholder()
                      : Image.asset(
                          'assets/ads/${assets[_i]}',
                          fit: BoxFit.cover,
                          errorBuilder: (_, error, stack) => _placeholder(),
                        ),
                ),
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
            Text(widget.spec, style: const TextStyle(fontSize: 10.5, color: Lm.muted)),
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
