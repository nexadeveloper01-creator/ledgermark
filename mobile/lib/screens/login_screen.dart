import 'package:flutter/material.dart';
import '../api.dart';
import '../theme.dart';

class LoginScreen extends StatefulWidget {
  final void Function(Map<String, dynamic> user) onLoggedIn;
  const LoginScreen({super.key, required this.onLoggedIn});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _signupMode = false;
  final _email = TextEditingController(text: 'a@consumer.test');
  final _name = TextEditingController();
  final _password = TextEditingController(text: 'ledgermark1234');
  String? _error;
  bool _loading = false;

  @override
  void dispose() {
    _email.dispose();
    _name.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _error = null;
      _loading = true;
    });
    try {
      final user = _signupMode
          ? await api.signup(_email.text.trim(), _name.text.trim(), _password.text)
          : await api.login(_email.text.trim(), _password.text);
      if (!mounted) return;
      widget.onLoggedIn(user);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = '연결에 실패했습니다. 서버가 실행 중인지 확인해주세요.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(28),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Blueprint(
              padding: const EdgeInsets.all(28),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('LEDGERMARK · CONSUMER',
                      style: TextStyle(fontSize: 10, letterSpacing: 2.2, color: Lm.accent700)),
                  const SizedBox(height: 8),
                  Text(_signupMode ? '소비자 가입' : '로그인',
                      style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  Text(
                    _signupMode
                        ? '가입 후 제품 UID를 스캔해 정품을 확인하고 등록할 수 있습니다.'
                        : '소비자 계정으로 로그인하세요. 데모 비밀번호는 ledgermark1234 입니다.',
                    style: const TextStyle(fontSize: 13, color: Lm.muted, height: 1.5),
                  ),
                  const SizedBox(height: 20),
                  _field('이메일', _email, keyboard: TextInputType.emailAddress),
                  if (_signupMode) ...[
                    const SizedBox(height: 12),
                    _field('이름', _name),
                  ],
                  const SizedBox(height: 12),
                  _field('비밀번호', _password, obscure: true),
                  if (_error != null) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: Lm.accent100,
                        border: Border.all(color: Lm.accent400),
                      ),
                      child: Text(_error!,
                          style: const TextStyle(fontSize: 12, color: Lm.accent900)),
                    ),
                  ],
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: _loading ? null : _submit,
                    child: Text(_loading ? '처리 중...' : (_signupMode ? '가입하기' : '로그인')),
                  ),
                  const SizedBox(height: 12),
                  Center(
                    child: TextButton(
                      onPressed: _loading
                          ? null
                          : () => setState(() {
                                _signupMode = !_signupMode;
                                _error = null;
                              }),
                      child: Text(
                        _signupMode ? '이미 계정이 있으신가요? 로그인' : '소비자이신가요? 가입하기',
                        style: const TextStyle(color: Lm.accent700, fontSize: 13),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _field(String label, TextEditingController c,
      {bool obscure = false, TextInputType? keyboard}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: Lm.muted)),
        const SizedBox(height: 5),
        TextField(controller: c, obscureText: obscure, keyboardType: keyboard),
      ],
    );
  }
}
