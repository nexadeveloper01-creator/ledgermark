import 'package:flutter/material.dart';
import '../i18n.dart';
import '../theme.dart';

// 첫 실행 온보딩: 정품 확인 → 등록·교환권 → 포인트/혜택 3단계 안내.
// 완료 시 onDone 호출(상위에서 SharedPreferences 플래그 저장).
class OnboardingScreen extends StatefulWidget {
  final VoidCallback onDone;
  const OnboardingScreen({super.key, required this.onDone});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _pc = PageController();
  int _page = 0;

  static const _pages = [
    (Icons.qr_code_scanner_rounded, 'onboard.t1', 'onboard.d1'),
    (Icons.card_giftcard_rounded, 'onboard.t2', 'onboard.d2'),
    (Icons.stars_rounded, 'onboard.t3', 'onboard.d3'),
  ];

  @override
  void dispose() {
    _pc.dispose();
    super.dispose();
  }

  void _next() {
    if (_page < _pages.length - 1) {
      _pc.nextPage(duration: const Duration(milliseconds: 260), curve: Curves.easeOut);
    } else {
      widget.onDone();
    }
  }

  @override
  Widget build(BuildContext context) {
    final last = _page == _pages.length - 1;
    return Scaffold(
      backgroundColor: Lm.bg,
      body: SafeArea(
        child: Column(
          children: [
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: widget.onDone,
                child: Text(tr('onboard.skip'), style: const TextStyle(color: Lm.muted)),
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: _pc,
                onPageChanged: (i) => setState(() => _page = i),
                itemCount: _pages.length,
                itemBuilder: (_, i) {
                  final (icon, tKey, dKey) = _pages[i];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 96,
                          height: 96,
                          decoration: BoxDecoration(
                            color: Lm.primary.withValues(alpha: 0.12),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(icon, color: Lm.primary, size: 46),
                        ),
                        const SizedBox(height: 28),
                        Text(tr(tKey),
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontSize: 23, fontWeight: FontWeight.w800, color: Lm.text)),
                        const SizedBox(height: 14),
                        Text(tr(dKey),
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontSize: 15, height: 1.6, color: Lm.muted)),
                      ],
                    ),
                  );
                },
              ),
            ),
            // 페이지 인디케이터
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(_pages.length, (i) {
                final on = i == _page;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: on ? 22 : 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: on ? Lm.primary : Lm.line,
                    borderRadius: BorderRadius.circular(4),
                  ),
                );
              }),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(28, 22, 28, 26),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _next,
                  style: FilledButton.styleFrom(
                    backgroundColor: Lm.primary,
                    minimumSize: const Size.fromHeight(52),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text(last ? tr('onboard.start') : tr('onboard.next'),
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
