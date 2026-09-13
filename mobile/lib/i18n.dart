import 'dart:ui';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

// 경량 다국어(한/영) 엔진. 기본은 기기 언어에 종속되며, 설정에서 한국어/English/시스템으로
// 바꾸면 SharedPreferences에 저장돼 유지된다. MaterialApp을 이 컨트롤러로 감싸 언어 변경 시
// 즉시 리빌드한다.
enum AppLang { system, ko, en, fil }

class I18n extends ChangeNotifier {
  static const _key = 'lm_lang';
  AppLang _pref = AppLang.system;

  AppLang get pref => _pref;

  Future<void> load() async {
    final p = await SharedPreferences.getInstance();
    switch (p.getString(_key)) {
      case 'ko':
        _pref = AppLang.ko;
        break;
      case 'en':
        _pref = AppLang.en;
        break;
      case 'fil':
        _pref = AppLang.fil;
        break;
      default:
        _pref = AppLang.system;
    }
    notifyListeners();
  }

  Future<void> setLang(AppLang lang) async {
    _pref = lang;
    final p = await SharedPreferences.getInstance();
    if (lang == AppLang.system) {
      await p.remove(_key);
    } else {
      await p.setString(_key, lang == AppLang.ko ? 'ko' : (lang == AppLang.fil ? 'fil' : 'en'));
    }
    notifyListeners();
  }

  // 설정 override가 있으면 그 언어, 없으면 기기 언어(ko/fil 매칭, 그 외 영어).
  String get code {
    if (_pref == AppLang.ko) return 'ko';
    if (_pref == AppLang.en) return 'en';
    if (_pref == AppLang.fil) return 'fil';
    final dev = PlatformDispatcher.instance.locale.languageCode;
    if (dev == 'ko') return 'ko';
    if (dev == 'fil' || dev == 'tl') return 'fil'; // Filipino/Tagalog 기기
    return 'en';
  }

  Locale? get localeOverride {
    if (_pref == AppLang.ko) return const Locale('ko');
    if (_pref == AppLang.en) return const Locale('en');
    if (_pref == AppLang.fil) return const Locale('fil');
    return null; // 시스템
  }

  String t(String key) {
    final row = _strings[key];
    if (row == null) {
      assert(() {
        debugPrint('[i18n] 누락된 키: $key');
        return true;
      }());
      return key;
    }
    return row[code] ?? row['en'] ?? key;
  }

  // 파라미터 치환: t('x', {'n':'3'}) → "...{n}..." 안의 {n} 교체
  String tp(String key, Map<String, String> args) {
    var s = t(key);
    args.forEach((k, v) => s = s.replaceAll('{$k}', v));
    return s;
  }
}

final i18n = I18n();

// 편의 함수
String tr(String key) => i18n.t(key);
String trp(String key, Map<String, String> args) => i18n.tp(key, args);

// ── 문자열 테이블 ─────────────────────────────────────────────────────
const Map<String, Map<String, String>> _strings = {
  // 공통
  'app.name': {'ko': 'ConiaMark', 'en': 'ConiaMark', 'fil': 'ConiaMark'},
  'common.cancel': {'ko': '취소', 'en': 'Cancel', 'fil': 'Kanselahin'},
  'common.confirm': {'ko': '확인', 'en': 'Confirm', 'fil': 'Kumpirmahin'},
  'common.close': {'ko': '닫기', 'en': 'Close', 'fil': 'Isara'},
  'common.retry': {'ko': '다시 시도', 'en': 'Retry', 'fil': 'Subukan ulit'},
  'common.loading': {'ko': '불러오는 중...', 'en': 'Loading...', 'fil': 'Naglo-load...'},
  'common.back': {'ko': '뒤로', 'en': 'Back', 'fil': 'Bumalik'},
  'common.save': {'ko': '저장', 'en': 'Save', 'fil': 'I-save'},

  // 로그인
  'login.title': {'ko': '로그인', 'en': 'Sign in', 'fil': 'Mag-sign in'},
  'login.subtitle': {'ko': '소비자 계정으로 로그인하세요.', 'en': 'Sign in with your consumer account.', 'fil': 'Mag-sign in gamit ang iyong consumer account.'},
  'login.email': {'ko': '이메일', 'en': 'Email', 'fil': 'Email'},
  'login.password': {'ko': '비밀번호', 'en': 'Password', 'fil': 'Password'},
  'login.submit': {'ko': '로그인', 'en': 'Sign in', 'fil': 'Mag-sign in'},
  'login.signup': {'ko': '소비자이신가요? 가입하기', 'en': 'New here? Create an account', 'fil': 'Bago dito? Gumawa ng account'},
  'login.name': {'ko': '이름', 'en': 'Name', 'fil': 'Pangalan'},
  'login.toLogin': {'ko': '이미 계정이 있으신가요? 로그인', 'en': 'Already have an account? Sign in', 'fil': 'May account na? Mag-sign in'},
  'login.signupSubmit': {'ko': '가입하기', 'en': 'Create account', 'fil': 'Gumawa ng account'},
  'login.failed': {'ko': '로그인에 실패했습니다.', 'en': 'Sign-in failed.', 'fil': 'Nabigo ang pag-sign in.'},

  // 하단 내비 / 홈
  'nav.home': {'ko': '홈', 'en': 'Home', 'fil': 'Home'},
  'nav.status': {'ko': '등록 상태', 'en': 'Status', 'fil': 'Status'},
  'nav.products': {'ko': '내 제품', 'en': 'Products', 'fil': 'Produkto'},
  'nav.rewards': {'ko': '혜택', 'en': 'Rewards', 'fil': 'Rewards'},
  'nav.scan': {'ko': '스캔', 'en': 'Scan', 'fil': 'I-scan'},
  'home.hello': {'ko': '안녕하세요 👋', 'en': 'Welcome 👋', 'fil': 'Maligayang pagdating 👋'},
  'home.logout': {'ko': '로그아웃', 'en': 'Sign out', 'fil': 'Mag-sign out'},
  'verify.banner': {'ko': '이메일 인증 후 정품 등록을 신청할 수 있습니다.', 'en': 'Verify your email to register products.', 'fil': 'I-verify ang email para makapag-register ng produkto.'},
  'verify.resend': {'ko': '인증 메일 다시 보내기', 'en': 'Resend verification email', 'fil': 'Muling ipadala ang verification email'},
  'verify.sent': {'ko': '인증 메일을 다시 보냈습니다.', 'en': 'Verification email sent again.', 'fil': 'Naipadala muli ang verification email.'},
  'verify.resendFail': {'ko': '재발송에 실패했습니다.', 'en': 'Failed to resend.', 'fil': 'Nabigo ang muling pagpapadala.'},

  // 대시보드
  'dash.ownedGenuine': {'ko': '보유 정품', 'en': 'Genuine owned', 'fil': 'Genuine na pag-aari'},
  'dash.genuineBadge': {'ko': '정품 인증', 'en': 'Verified', 'fil': 'Verified'},
  'dash.registeredCount': {'ko': '개 등록', 'en': 'registered', 'fil': 'nakarehistro'},
  'dash.overview': {'ko': '개요', 'en': 'Overview', 'fil': 'Buod'},
  'dash.myPoints': {'ko': '내 포인트', 'en': 'My points', 'fil': 'Aking puntos'},
  'dash.checkinCta': {'ko': '출석하기', 'en': 'Check in', 'fil': 'Mag-check in'},
  'dash.weeks': {'ko': '주', 'en': 'wk', 'fil': 'linggo'},
  'dash.statOwned': {'ko': '보유 제품', 'en': 'Products', 'fil': 'Produkto'},
  'dash.statVouchers': {'ko': '유효 교환권', 'en': 'Vouchers', 'fil': 'Voucher'},
  'dash.statPending': {'ko': '등록 대기', 'en': 'Pending', 'fil': 'Pending'},
  'dash.statCommitted': {'ko': '등록 완료', 'en': 'Registered', 'fil': 'Nakarehistro'},
  'dash.scanTitle': {'ko': '제품 정품 확인', 'en': 'Verify a product', 'fil': 'I-verify ang produkto'},
  'dash.scanDesc': {'ko': 'QR·UID를 스캔해 정품을 등록하세요', 'en': 'Scan a QR/UID to register a genuine product', 'fil': 'I-scan ang QR/UID para irehistro ang genuine na produkto'},

  // 혜택/포인트
  'rewards.myPoints': {'ko': '내 포인트', 'en': 'My points', 'fil': 'Aking puntos'},
  'rewards.streak': {'ko': '{n}주 연속 출석', 'en': '{n}-week streak', 'fil': '{n}-linggong streak'},
  'rewards.checkin': {'ko': '주간 출석', 'en': 'Weekly check-in', 'fil': 'Lingguhang check-in'},
  'rewards.checkedIn': {'ko': '출석 완료', 'en': 'Checked in', 'fil': 'Naka-check in'},
  'rewards.checkinDone': {'ko': '출석 완료! +{p} P · {n}주 연속', 'en': 'Checked in! +{p} pts · {n}-week streak', 'fil': 'Naka-check in! +{p} pts · {n}-linggong streak'},
  'rewards.earnTitle': {'ko': '포인트 쌓기', 'en': 'Earn points', 'fil': 'Kumita ng puntos'},
  'rewards.earnDesc': {'ko': '설문에 참여하고 포인트를 받으세요', 'en': 'Answer surveys to earn points', 'fil': 'Sagutin ang survey para kumita ng puntos'},
  'rewards.useTitle': {'ko': '포인트 사용', 'en': 'Spend points', 'fil': 'Gamitin ang puntos'},
  'rewards.useDesc': {'ko': '경품 응모 · 콘텐츠 해금 · 할인', 'en': 'Prizes · unlocks · discounts', 'fil': 'Premyo · unlock · diskwento'},
  'rewards.history': {'ko': '적립 내역', 'en': 'History', 'fil': 'History'},
  'rewards.noHistory': {'ko': '아직 적립 내역이 없어요.', 'en': 'No activity yet.', 'fil': 'Wala pang aktibidad.'},
  'rewards.done': {'ko': '완료', 'en': 'Done', 'fil': 'Tapos na'},
  'rewards.redeem': {'ko': '신청', 'en': 'Redeem', 'fil': 'I-redeem'},
  'rewards.soldOut': {'ko': '품절', 'en': 'Sold out', 'fil': 'Ubos na'},
  'rewards.insufficient': {'ko': '부족', 'en': 'Low', 'fil': 'Kulang'},
  'rewards.redeemConfirm': {'ko': '{p} P를 사용해 신청하시겠어요?', 'en': 'Use {p} pts to redeem this?', 'fil': 'Gamitin ang {p} pts para i-redeem ito?'},
  'rewards.use': {'ko': '사용', 'en': 'Use', 'fil': 'Gamitin'},
  'rewards.redeemDone': {'ko': '신청 완료! 잔액 {b} P', 'en': 'Done! Balance {b} pts', 'fil': 'Tapos na! Balanse {b} pts'},
  'rewards.surveyDone': {'ko': '설문 참여 완료! +{p} P', 'en': 'Survey complete! +{p} pts', 'fil': 'Kumpleto ang survey! +{p} pts'},

  // 혜택 요약(동의/쿠폰)
  'benefits.title': {'ko': '개인정보 동의 & 혜택', 'en': 'Consent & benefits', 'fil': 'Consent at benepisyo'},
  'benefits.manage': {'ko': '동의 관리', 'en': 'Manage consent', 'fil': 'Pamahalaan ang consent'},
  'benefits.consentPts': {'ko': '동의로 받은 포인트', 'en': 'Consent points', 'fil': 'Puntos mula sa consent'},
  'benefits.coupons': {'ko': '보유 쿠폰', 'en': 'Coupons', 'fil': 'Coupon'},
  'benefits.discount': {'ko': '할인 혜택', 'en': 'Discounts', 'fil': 'Diskwento'},
  'benefits.couponsUnit': {'ko': '장', 'en': '', 'fil': ''},
  'coupons.title': {'ko': '내 쿠폰', 'en': 'My coupons', 'fil': 'Aking coupon'},
  'coupons.desc': {'ko': '포인트로 받은 할인 혜택', 'en': 'Discounts earned with points', 'fil': 'Mga diskwentong nakuha sa puntos'},
  'coupons.usable': {'ko': '사용 가능', 'en': 'Available', 'fil': 'Magagamit'},
  'coupons.used': {'ko': '사용완료', 'en': 'Used', 'fil': 'Nagamit na'},
  'coupons.expired': {'ko': '만료', 'en': 'Expired', 'fil': 'Expired na'},
  'coupons.showQr': {'ko': 'QR 제시', 'en': 'Show QR', 'fil': 'Ipakita ang QR'},
  'coupons.qrTitle': {'ko': '매장 계산대에서 이 QR을 보여주세요', 'en': 'Show this QR at the store counter', 'fil': 'Ipakita ang QR na ito sa counter ng tindahan'},
  'coupons.qrNote': {'ko': '결제가 완료되면 자동으로 사용 처리됩니다.', 'en': 'It is marked used automatically at checkout.', 'fil': 'Awtomatikong mamarkahang nagamit pagkatapos ng bayad.'},

  // 포인트 사유
  'reason.SIGNUP_BONUS': {'ko': '가입 축하', 'en': 'Signup bonus', 'fil': 'Signup bonus'},
  'reason.DEVICE_REGISTRATION': {'ko': '정품 등록', 'en': 'Product registration', 'fil': 'Rehistro ng produkto'},
  'reason.WEEKLY_CHECKIN': {'ko': '주간 출석', 'en': 'Weekly check-in', 'fil': 'Lingguhang check-in'},
  'reason.STREAK_BONUS': {'ko': '연속 출석 보너스', 'en': 'Streak bonus', 'fil': 'Streak bonus'},
  'reason.SURVEY_COMPLETION': {'ko': '설문 참여', 'en': 'Survey', 'fil': 'Survey'},
  'reason.PROFILE_COMPLETION': {'ko': '프로필 입력', 'en': 'Profile', 'fil': 'Profile'},
  'reason.CONSENT_REWARD': {'ko': '개인정보 활용 동의', 'en': 'Data consent', 'fil': 'Data consent'},
  'reason.REWARD_REDEMPTION': {'ko': '리워드 사용', 'en': 'Redemption', 'fil': 'Redemption'},
  'reason.ADJUSTMENT': {'ko': '조정', 'en': 'Adjustment', 'fil': 'Adjustment'},

  // 동의 화면
  'consent.title': {'ko': '개인정보 동의 & 혜택', 'en': 'Consent & benefits', 'fil': 'Consent at benepisyo'},
  'consent.intro': {
    'ko': '동의하신 정보는 맞춤 혜택·제품 개선에만 활용되며, 그 대가로 포인트와 할인 혜택을 드립니다. 언제든 철회할 수 있어요.',
    'en': 'Consented data is used only for tailored benefits and product improvement, in exchange for points and discounts. You can withdraw anytime.',
    'fil': 'Ang datos na pinayagan mo ay ginagamit lang para sa personalisadong benepisyo at pagpapahusay ng produkto, kapalit ng puntos at diskwento. Puwede kang mag-withdraw anumang oras.'
  },
  'consent.save': {'ko': '동의 설정 저장', 'en': 'Save consent', 'fil': 'I-save ang consent'},
  'consent.footnote': {'ko': '이미 보상을 받은 항목은 철회 후 재동의해도 다시 지급되지 않습니다.', 'en': 'Already-rewarded scopes are not paid again if re-granted.', 'fil': 'Ang mga na-reward na ay hindi na muling babayaran kahit i-grant ulit.'},
  'consent.rewarded': {'ko': '보상 완료 · +{p} P', 'en': 'Rewarded · +{p} pts', 'fil': 'Na-reward · +{p} pts'},
  'consent.grantPts': {'ko': '동의 시 +{p} P', 'en': '+{p} pts on consent', 'fil': '+{p} pts kapag pumayag'},
  'consent.savedAwarded': {'ko': '동의 완료! +{p} P 적립', 'en': 'Saved! +{p} pts', 'fil': 'Na-save! +{p} pts'},
  'consent.saved': {'ko': '동의 설정을 저장했습니다.', 'en': 'Consent settings saved.', 'fil': 'Na-save ang consent settings.'},
  'scope.profile': {'ko': '프로필 정보(연령대·지역)', 'en': 'Profile (age band · region)', 'fil': 'Profile (edad · rehiyon)'},
  'scope.usage': {'ko': '제품 사용 습관', 'en': 'Usage habits', 'fil': 'Gawi sa paggamit'},
  'scope.location': {'ko': '위치 기반', 'en': 'Location', 'fil': 'Lokasyon'},
  'scope.marketing': {'ko': '맞춤 광고·마케팅 활용', 'en': 'Personalized marketing', 'fil': 'Personalisadong marketing'},

  // 제품/교환
  'products.title': {'ko': '내 제품', 'en': 'My products', 'fil': 'Aking produkto'},
  'products.desc': {'ko': '보유 중인 제품의 교환권 상태를 확인하고 교환·중고거래를 신청합니다.', 'en': 'Check voucher status and request exchange or resale.', 'fil': 'Tingnan ang voucher status at mag-request ng exchange o resale.'},
  'products.none': {'ko': '보유한 제품이 없습니다.', 'en': 'No products yet.', 'fil': 'Wala pang produkto.'},
  'products.exchange': {'ko': '교환 신청', 'en': 'Request exchange', 'fil': 'Mag-request ng exchange'},
  'products.resell': {'ko': '중고거래 등록', 'en': 'List for resale', 'fil': 'I-list para ibenta'},
  'products.voucher': {'ko': '교환권', 'en': 'Voucher', 'fil': 'Voucher'},
  'products.exchangeTitle': {'ko': '무상 교환 혜택', 'en': 'Free exchange', 'fil': 'Libreng palit'},
  'products.exchangeBase': {'ko': '기기당 최초 1회 무상 교환이 제공됩니다.', 'en': 'One free exchange per device.', 'fil': 'Isang libreng palit kada device.'},
  'products.bonusOpen': {'ko': '자격 충족! 추가 무상 교환 {n}회 사용 가능 — 교환권이 없는 기기에서 "추가 교환 활성화"를 누르세요.', 'en': 'Qualified! {n} extra free exchange available — tap "Activate extra exchange" on a device with no voucher.', 'fil': 'Kwalipikado! {n} dagdag na libreng palit — i-tap ang "I-activate ang dagdag na palit" sa device na walang voucher.'},
  'products.bonusLocked': {'ko': '전체 설문 완료 + 정보 이용 동의 시 추가 1회 무상 교환이 열립니다.', 'en': 'Complete all surveys + consent to unlock one extra free exchange.', 'fil': 'Kumpletuhin lahat ng survey + consent para ma-unlock ang dagdag na libreng palit.'},
  'products.activateBonus': {'ko': '추가 무상 교환 활성화', 'en': 'Activate extra exchange', 'fil': 'I-activate ang dagdag na palit'},
  'products.bonusDone': {'ko': '추가 무상 교환권이 활성화되었습니다. 이제 교환을 신청할 수 있어요.', 'en': 'Extra exchange activated. You can now request an exchange.', 'fil': 'Na-activate ang dagdag na palit. Puwede ka nang mag-request ng exchange.'},
  'products.exchanged': {'ko': '교환 신청이 접수되었습니다. 매장 AS 검수 후 처리됩니다.', 'en': 'Exchange requested. It will be handled after store inspection.', 'fil': 'Na-request ang exchange. Aasikasuhin pagkatapos ng inspeksyon sa tindahan.'},
  'products.resellAsk': {'ko': '양수인 이메일', 'en': "Buyer's email", 'fil': 'Email ng mamimili'},
  'products.resellTitle': {'ko': '중고거래 양수인', 'en': 'Resale recipient', 'fil': 'Tatanggap ng resale'},
  'products.resellCta': {'ko': '양도', 'en': 'Transfer', 'fil': 'I-transfer'},
  'voucher.expiringSoon': {'ko': '곧 만료 D-{n}', 'en': 'Expires in {n}d', 'fil': 'Mag-e-expire sa {n}d'},
  'voucher.expiredLabel': {'ko': '만료됨', 'en': 'Expired', 'fil': 'Expired na'},

  // 스캔
  'scan.title': {'ko': 'UID 스캔', 'en': 'Scan UID', 'fil': 'I-scan ang UID'},
  'scan.desc': {'ko': '제품 하단 코드를 입력하면 원장에서 즉시 조회됩니다.', 'en': 'Enter the code under the product to verify against the ledger.', 'fil': 'Ilagay ang code sa ilalim ng produkto para i-verify sa ledger.'},
  'scan.uidCode': {'ko': 'UID 코드', 'en': 'UID code', 'fil': 'UID code'},
  'scan.camera': {'ko': '카메라로 스캔', 'en': 'Scan with camera', 'fil': 'I-scan gamit ang camera'},
  'scan.lookup': {'ko': '코드로 조회', 'en': 'Look up by code', 'fil': 'Hanapin gamit ang code'},
  'scan.notFound': {'ko': '원장에 존재하지 않는 UID입니다. 위조품일 수 있습니다.', 'en': 'UID not on the ledger — it may be counterfeit.', 'fil': 'Wala sa ledger ang UID — maaaring peke ito.'},
  'scan.lookupFail': {'ko': '조회에 실패했습니다.', 'en': 'Lookup failed.', 'fil': 'Nabigo ang paghahanap.'},
  'scan.genuine': {'ko': '원장 일치 · 정품 확인', 'en': 'On ledger · genuine', 'fil': 'Nasa ledger · genuine'},
  'scan.checkStatus': {'ko': '원장 일치 · 상태 확인 필요', 'en': 'On ledger · check status', 'fil': 'Nasa ledger · tingnan ang status'},
  'scan.product': {'ko': '제품', 'en': 'Product', 'fil': 'Produkto'},
  'scan.status': {'ko': '현재 상태', 'en': 'Status', 'fil': 'Status'},
  'scan.continue': {'ko': '연령인증으로', 'en': 'Continue to age check', 'fil': 'Ituloy sa age check'},
  'scan.claimDone': {'ko': '{p} 정품 등록 완료! 소유권 이전 · +{pt} P', 'en': '{p} registered! Ownership transferred · +{pt} pts', 'fil': 'Nairehistro ang {p}! Nailipat ang pagmamay-ari · +{pt} pts'},
  'scan.ageTitle': {'ko': '연령인증', 'en': 'Age verification', 'fil': 'Age verification'},
  'scan.ageDesc': {'ko': '정부발급 ID 스캔과 Liveness 검사를 수행합니다.', 'en': 'Government ID scan and liveness check.', 'fil': 'Government ID scan at liveness check.'},
  'scan.birth': {'ko': '생년월일 (YYYY-MM-DD)', 'en': 'Date of birth (YYYY-MM-DD)', 'fil': 'Petsa ng kapanganakan (YYYY-MM-DD)'},
  'scan.idScanned': {'ko': '정부발급 ID 스캔 완료', 'en': 'Government ID scanned', 'fil': 'Na-scan ang Government ID'},
  'scan.liveness': {'ko': 'Liveness 검사 통과', 'en': 'Liveness passed', 'fil': 'Pasado sa liveness'},
  'scan.verifyResult': {'ko': '검증 결과', 'en': 'Result', 'fil': 'Resulta'},
  'scan.pass': {'ko': '통과', 'en': 'Passed', 'fil': 'Pasado'},
  'scan.fail': {'ko': '실패', 'en': 'Failed', 'fil': 'Bigo'},
  'scan.needEmail': {'ko': '이메일 인증을 완료해야 정품 등록을 신청할 수 있습니다.', 'en': 'Verify your email before registering.', 'fil': 'I-verify ang email bago mag-register.'},
  'scan.register': {'ko': '정품 등록 신청', 'en': 'Register product', 'fil': 'Irehistro ang produkto'},
  'scan.verify': {'ko': '인증 완료', 'en': 'Verify', 'fil': 'I-verify'},
  'scan.backToScan': {'ko': '← 스캔으로 돌아가기', 'en': '← Back to scan', 'fil': '← Bumalik sa scan'},

  // 설문
  'survey.submit': {'ko': '제출하고 {p} P 받기', 'en': 'Submit & get {p} pts', 'fil': 'I-submit at kumuha ng {p} pts'},
  'survey.freeText': {'ko': '자유롭게 입력해 주세요 (선택)', 'en': 'Optional free text', 'fil': 'Opsyonal na sagot'},

  // 상태 탭
  'status.title': {'ko': '등록 상태', 'en': 'Registration status', 'fil': 'Status ng rehistro'},
  'status.none': {'ko': '등록 신청 내역이 없습니다.', 'en': 'No registration requests yet.', 'fil': 'Wala pang registration request.'},

  // 설정
  'settings.title': {'ko': '설정', 'en': 'Settings', 'fil': 'Settings'},
  'settings.language': {'ko': '언어', 'en': 'Language', 'fil': 'Wika'},
  'settings.langSystem': {'ko': '시스템 기본', 'en': 'System default', 'fil': 'Default ng system'},
  'settings.langKo': {'ko': '한국어', 'en': 'Korean', 'fil': 'Korean'},
  'settings.langEn': {'ko': 'English', 'en': 'English', 'fil': 'English'},
  'settings.langFil': {'ko': 'Filipino', 'en': 'Filipino', 'fil': 'Filipino'},
  'settings.legal': {'ko': '약관 및 정책', 'en': 'Legal', 'fil': 'Legal'},
  'settings.privacy': {'ko': '개인정보 처리방침', 'en': 'Privacy Policy', 'fil': 'Patakaran sa Privacy'},
  'settings.terms': {'ko': '이용약관', 'en': 'Terms of Service', 'fil': 'Mga Tuntunin ng Serbisyo'},
  'settings.account': {'ko': '계정', 'en': 'Account', 'fil': 'Account'},
  'settings.logout': {'ko': '로그아웃', 'en': 'Sign out', 'fil': 'Mag-sign out'},
  'settings.deleteAccount': {'ko': '계정 삭제', 'en': 'Delete account', 'fil': 'Tanggalin ang account'},
  'settings.deleteConfirmTitle': {'ko': '계정을 삭제할까요?', 'en': 'Delete your account?', 'fil': 'Tanggalin ang iyong account?'},
  'settings.deleteConfirmBody': {
    'ko': '계정과 개인정보가 삭제됩니다. 보유 포인트·쿠폰은 사라지며 되돌릴 수 없습니다. 계속하려면 비밀번호를 입력하세요.',
    'en': 'Your account and personal data will be deleted. Points and coupons are lost and this cannot be undone. Enter your password to continue.',
    'fil': 'Buburahin ang iyong account at personal na datos. Mawawala ang puntos at coupon at hindi na maibabalik. Ilagay ang password para magpatuloy.'
  },
  'settings.deleteCta': {'ko': '영구 삭제', 'en': 'Delete permanently', 'fil': 'Tanggalin nang permanente'},
  'settings.deleteDone': {'ko': '계정이 삭제되었습니다.', 'en': 'Your account has been deleted.', 'fil': 'Natanggal na ang iyong account.'},
  'settings.deleteFail': {'ko': '삭제에 실패했습니다.', 'en': 'Deletion failed.', 'fil': 'Nabigo ang pagtanggal.'},
  'settings.version': {'ko': '버전', 'en': 'Version', 'fil': 'Bersyon'},

  // 성인 게이트
  'age.title': {'ko': '성인 확인', 'en': 'Age verification', 'fil': 'Age verification'},
  'age.body': {
    'ko': '이 앱은 만 20세 이상 성인만 이용할 수 있습니다. 만 20세 이상이십니까?',
    'en': 'This app is for adults aged 20+ only. Are you 20 or older?',
    'fil': 'Para lamang sa may edad 20 pataas ang app na ito. Ikaw ba ay 20 anyos pataas?'
  },
  'age.yes': {'ko': '네, 성인입니다', 'en': "Yes, I'm 20+", 'fil': 'Oo, 20+ ako'},
  'age.no': {'ko': '아니요', 'en': 'No', 'fil': 'Hindi'},
  'age.blocked': {'ko': '만 20세 이상만 이용할 수 있어 앱을 종료합니다.', 'en': 'This app is restricted to adults 20+.', 'fil': 'Limitado ang app na ito sa may edad 20 pataas.'},
  'age.notice': {'ko': '성인 대상 · 니코틴 함유 제품 관련 서비스', 'en': 'Adults only · relates to nicotine-containing products', 'fil': 'Para sa nasa hustong gulang · may kaugnayan sa produktong may nikotina'},

  // 온보딩(첫 실행 안내)
  'onboard.skip': {'ko': '건너뛰기', 'en': 'Skip', 'fil': 'Laktawan'},
  'onboard.next': {'ko': '다음', 'en': 'Next', 'fil': 'Susunod'},
  'onboard.start': {'ko': '시작하기', 'en': 'Get started', 'fil': 'Magsimula'},
  'onboard.t1': {'ko': '스캔 한 번으로 정품 확인', 'en': 'Verify authenticity in one scan', 'fil': 'I-verify ang pagka-genuine sa isang scan'},
  'onboard.d1': {'ko': '제품의 UID를 스캔하면 원장과 대조해 정품/위조를 즉시 알려드립니다.', 'en': 'Scan the product UID to instantly check genuine vs. counterfeit against the ledger.', 'fil': 'I-scan ang UID ng produkto para malaman agad kung genuine o peke gamit ang ledger.'},
  'onboard.t2': {'ko': '등록하고 무상 교환권', 'en': 'Register & get a free exchange', 'fil': 'Magrehistro at kumuha ng libreng palit'},
  'onboard.d2': {'ko': '정품을 내 소유로 등록하면 3개월 유효 무상 교환권 1회가 제공됩니다.', 'en': 'Register a genuine product to your account and get one free exchange voucher valid for 3 months.', 'fil': 'Irehistro ang genuine na produkto sa iyong account at makakuha ng libreng palit na balido ng 3 buwan.'},
  'onboard.t3': {'ko': '포인트와 혜택', 'en': 'Points & rewards', 'fil': 'Puntos at rewards'},
  'onboard.d3': {'ko': '동의·설문·출석으로 포인트를 쌓고 할인 쿠폰으로 사용하세요.', 'en': 'Earn points from consent, surveys and check-ins, then spend them as discount coupons.', 'fil': 'Kumita ng puntos mula sa consent, survey at check-in, gamitin bilang discount coupon.'},
};
