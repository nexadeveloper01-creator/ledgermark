import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../theme.dart';

// 카메라로 QR/바코드를 읽어 첫 유효 코드를 반환하는 전체 화면 스캐너.
// 카메라를 못 쓰는 환경(권한 거부·카메라 없음·헤드리스)에서는 오류 안내와 함께
// 닫기만 제공하고, 호출 측의 수동 입력으로 폴백한다.
class QrScannerScreen extends StatefulWidget {
  const QrScannerScreen({super.key});

  @override
  State<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends State<QrScannerScreen> {
  final _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    facing: CameraFacing.back,
  );
  bool _handled = false;
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_handled) return;
    final raw = capture.barcodes
        .map((b) => b.rawValue)
        .firstWhere((v) => v != null && v.trim().isNotEmpty, orElse: () => null);
    if (raw == null) return;
    _handled = true;
    Navigator.of(context).pop(raw.trim());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text('UID 스캔', style: TextStyle(fontSize: 16)),
        actions: [
          IconButton(
            tooltip: '플래시',
            icon: const Icon(Icons.flash_on),
            onPressed: () => _controller.toggleTorch(),
          ),
          IconButton(
            tooltip: '카메라 전환',
            icon: const Icon(Icons.cameraswitch),
            onPressed: () => _controller.switchCamera(),
          ),
        ],
      ),
      body: Stack(
        alignment: Alignment.center,
        children: [
          MobileScanner(
            controller: _controller,
            onDetect: _onDetect,
            errorBuilder: (context, error) {
              return _CameraError(message: _describe(error));
            },
          ),
          // 조준 가이드 (청사진 사각 프레임)
          IgnorePointer(
            child: Container(
              width: 220,
              height: 220,
              decoration: BoxDecoration(border: Border.all(color: Lm.accent, width: 2)),
            ),
          ),
          Positioned(
            bottom: 40,
            left: 24,
            right: 24,
            child: Text(
              _error ?? '제품의 QR 또는 UID 코드를 사각 안에 맞춰주세요.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }

  String _describe(MobileScannerException e) {
    switch (e.errorCode) {
      case MobileScannerErrorCode.permissionDenied:
        return '카메라 권한이 거부되었습니다. 설정에서 허용한 뒤 다시 시도하거나 코드를 직접 입력해주세요.';
      case MobileScannerErrorCode.unsupported:
        return '이 기기·브라우저에서는 카메라 스캔을 지원하지 않습니다. 코드를 직접 입력해주세요.';
      default:
        return '카메라를 시작할 수 없습니다. 코드를 직접 입력해주세요.';
    }
  }
}

class _CameraError extends StatelessWidget {
  final String message;
  const _CameraError({required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.no_photography, color: Colors.white54, size: 48),
            const SizedBox(height: 16),
            Text(message,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white, height: 1.5)),
            const SizedBox(height: 20),
            OutlinedButton(
              onPressed: () => Navigator.of(context).pop(),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.white,
                side: const BorderSide(color: Colors.white54),
              ),
              child: const Text('직접 입력하기'),
            ),
          ],
        ),
      ),
    );
  }
}
