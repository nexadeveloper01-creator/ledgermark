-- 동시 실행된 스케줄러가 같은 구간을 중복 앵커링하지 못하도록 DB 수준에서 막는다.
CREATE UNIQUE INDEX "Anchor_fromSequence_key" ON "Anchor"("fromSequence");
