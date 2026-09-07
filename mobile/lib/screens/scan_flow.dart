import 'package:flutter/material.dart';
import '../theme.dart';
import 'scan_tab.dart';

// FAB에서 열리는 스캔 흐름(스캔 → 연령인증 → 등록). 등록 신청이 끝나면 requestId를
// 반환하며 pop 되어, 홈 셸이 등록 상태 탭으로 전환한다.
class ScanFlowScreen extends StatelessWidget {
  final String consumerId;
  final bool emailVerified;
  const ScanFlowScreen({super.key, required this.consumerId, required this.emailVerified});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Lm.bg,
      appBar: AppBar(
        backgroundColor: Lm.bg,
        surfaceTintColor: Lm.bg,
        elevation: 0,
        centerTitle: true,
        title: const Text('정품 확인', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        leading: IconButton(
          icon: const Icon(Icons.close_rounded, color: Lm.text),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: ScanTab(
        consumerId: consumerId,
        emailVerified: emailVerified,
        onRegistered: (requestId) => Navigator.of(context).pop(requestId),
      ),
    );
  }
}
