// Industry 디자인 시스템의 청사진(blueprint) 등록 마크 — .blueprint 요소마다 4개씩 붙인다.
export function Corners() {
  return (
    <>
      <i className="corner tl" />
      <i className="corner tr" />
      <i className="corner bl" />
      <i className="corner br" />
    </>
  );
}
