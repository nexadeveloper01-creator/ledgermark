// 미들웨어(Edge 런타임)와 서버 코드가 함께 쓰는 상수. Node 전용 모듈을 Edge 번들로
// 끌고 들어가지 않도록 세션 로직과 분리해 둔다.
export const SESSION_COOKIE = "lm_session";
