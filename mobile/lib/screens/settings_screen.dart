import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../api.dart';
import '../i18n.dart';
import '../theme.dart';

// 설정: 언어(시스템/한국어/English) · 약관/정책 · 계정 삭제 · 로그아웃.
class SettingsScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final Future<void> Function() onLogout;
  const SettingsScreen({super.key, required this.user, required this.onLogout});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Lm.bg,
      appBar: AppBar(
        backgroundColor: Lm.bg,
        elevation: 0,
        foregroundColor: Lm.text,
        title: Text(tr('settings.title')),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(18, 8, 18, 40),
        children: [
          _section(tr('settings.language')),
          Panel(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            child: Column(
              children: [
                _langTile(tr('settings.langSystem'), AppLang.system),
                _langTile(tr('settings.langKo'), AppLang.ko),
                _langTile(tr('settings.langEn'), AppLang.en),
              ],
            ),
          ),
          const SizedBox(height: 22),
          _section(tr('settings.legal')),
          Panel(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
            child: Column(
              children: [
                _linkTile(Icons.privacy_tip_rounded, tr('settings.privacy'), '/privacy'),
                _linkTile(Icons.description_rounded, tr('settings.terms'), '/terms'),
              ],
            ),
          ),
          const SizedBox(height: 22),
          _section(tr('settings.account')),
          Panel(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.logout_rounded, color: Lm.muted),
                  title: Text(tr('settings.logout')),
                  onTap: () => widget.onLogout(),
                ),
                ListTile(
                  leading: const Icon(Icons.delete_forever_rounded, color: Lm.warnFg),
                  title: Text(tr('settings.deleteAccount'), style: const TextStyle(color: Lm.warnFg)),
                  onTap: _confirmDelete,
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          Center(
            child: Text('${tr('settings.version')} 1.0.0',
                style: const TextStyle(fontSize: 12, color: Lm.muted)),
          ),
        ],
      ),
    );
  }

  Widget _section(String label) => Padding(
        padding: const EdgeInsets.fromLTRB(4, 0, 4, 8),
        child: Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Lm.muted)),
      );

  Widget _langTile(String label, AppLang lang) {
    return RadioListTile<AppLang>(
      contentPadding: const EdgeInsets.symmetric(horizontal: 12),
      dense: true,
      activeColor: Lm.primary,
      value: lang,
      groupValue: i18n.pref,
      title: Text(label),
      onChanged: (v) async {
        if (v != null) {
          await i18n.setLang(v);
          if (mounted) setState(() {});
        }
      },
    );
  }

  Widget _linkTile(IconData icon, String label, String path) {
    return ListTile(
      leading: Icon(icon, color: Lm.muted),
      title: Text(label),
      trailing: const Icon(Icons.chevron_right_rounded, color: Lm.muted),
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => _LegalScreen(title: label, url: '${Api.baseUrl}$path')),
      ),
    );
  }

  Future<void> _confirmDelete() async {
    final pw = TextEditingController();
    String? error;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          backgroundColor: Lm.bg,
          title: Text(tr('settings.deleteConfirmTitle')),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(tr('settings.deleteConfirmBody'), style: const TextStyle(fontSize: 13, height: 1.5)),
              const SizedBox(height: 12),
              TextField(
                controller: pw,
                obscureText: true,
                decoration: InputDecoration(labelText: tr('login.password'), errorText: error),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(tr('common.cancel'))),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: Lm.warnFg),
              onPressed: () async {
                try {
                  await api.deleteAccount(pw.text);
                  if (ctx.mounted) Navigator.pop(ctx, true);
                } on ApiException catch (e) {
                  setLocal(() => error = e.message);
                }
              },
              child: Text(tr('settings.deleteCta')),
            ),
          ],
        ),
      ),
    );
    if (ok == true) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(tr('settings.deleteDone'))));
      }
      await widget.onLogout();
    }
  }
}

// 약관/개인정보 처리방침을 앱 내 WebView로 표시.
class _LegalScreen extends StatelessWidget {
  final String title;
  final String url;
  const _LegalScreen({required this.title, required this.url});

  @override
  Widget build(BuildContext context) {
    final controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..loadRequest(Uri.parse(url));
    return Scaffold(
      appBar: AppBar(backgroundColor: Lm.bg, elevation: 0, foregroundColor: Lm.text, title: Text(title)),
      body: SafeArea(child: WebViewWidget(controller: controller)),
    );
  }
}
