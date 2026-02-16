import { useEffect, useRef } from "react";

const HeartCanvas = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const startTime = Date.now();
        let animationId;

        const ctx = canvas.getContext("2d");

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        resize();

        function heartVal(x, y) {
            const a = x * x + y * y - 1;
            return a * a * a - x * x * y * y * y;
        }

        function sampleHeart(scale) {
            while (1) {
                const x = Math.random() * 3 - 1.5;
                const y = Math.random() * 3 - 1.5;

                let v = heartVal(x, y);

                if (v <= 0) {
                    return {
                        x: x * scale,
                        y: -y * scale,
                        v: v,
                    };
                }

                // HẠT AURA: sát viền, mỏng
                if (v > 0 && v < 0.03 && Math.random() < 0.2) {
                    return { x: x * scale, y: -y * scale, v: -0.0001 };
                }
            }
        }

        // TẠO HẠT CHO TRÁI TIM
        const numberParticles = 8000;
        const particles = [];
        for (let i = 0; i < numberParticles; i++) {
            const point = sampleHeart(150);

            const angle = Math.random() * Math.PI * 2;
            const radius = Math.max(canvas.width, canvas.height);

            const x = canvas.width / 2 + Math.cos(angle) * radius;
            const y = canvas.height / 2 + Math.sin(angle) * radius;

            // const depth = Math.min(1, Math.abs(point.v) * 2);
            const depth = Math.min(1, Math.abs(point.v) * 1);

            particles.push({
                x: x, // Điểm xuất phát ở ngoài màn hình
                y: y,
                targetX: canvas.width / 2 + point.x, // Điểm đích đến
                targetY: canvas.height / 2 + point.y,
                vx: 0,
                vy: 0,
                // THÊM 3 thuộc tính mới:
                size: 0.4 + Math.random() * 0.7, // 0.4 → 1.1 (nhỏ hơn → mịn hơn)
                alpha: 0.15 + Math.random() * 0.3, // 0.15 → 0.45
                speed: 0.04 + Math.random() * 0.06,
                driftAngle: Math.random() * Math.PI * 2,
                driftSpeed: 0.3 + Math.random() * 0.5, // giảm drift → hạt giữ form hơn
                driftFreq: 0.5 + Math.random() * 2, // tốc độ lắc: 0.5 → 2.5 (mỗi hạt khác nhau)
                beatPhase: Math.random() * 0.04, // lệch pha 0 → 15% chu kỳ
                depth: depth,
            });
        }

        function render() {
            ctx.globalCompositeOperation = "source-over";
            ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const timeNow = Date.now();
            const time = timeNow / 1000;
            const t = (timeNow / 1200) % 1;

            let beat;
            // Sửa thành:
            if (t < 0.25) {
                // 250ms căng → CHẬM HƠN
                beat = 1 + (t / 0.25) * 0.15;
            } else if (t < 0.35) {
                // 100ms co → vẫn nhanh
                beat = 1 + 0.15 * (1 - (t - 0.25) / 0.1);
            } else {
                // Nghỉ
                beat = 1;
            }

            const elapsed = timeNow - startTime;
            if (elapsed < 5000) {
                animationId = requestAnimationFrame(render);
                return;
            }

            ctx.globalCompositeOperation = "lighter";
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];

                const pt = (timeNow / 2500 + p.beatPhase) % 1;
                let pBeat;

                if (pt < 0.08) {
                    // LUB lên (mạnh) — ease-in
                    const progress = pt / 0.08;
                    pBeat = 1.0 + Math.pow(progress, 1.5) * 0.12;
                } else if (pt < 0.16) {
                    // LUB xuống — ease-out
                    const progress = (pt - 0.08) / 0.08;
                    pBeat = 1.12 - Math.pow(progress, 0.7) * 0.09;
                } else if (pt < 0.22) {
                    // DUB lên (nhẹ) — ease-in
                    const progress = (pt - 0.16) / 0.06;
                    pBeat = 1.03 + Math.pow(progress, 1.5) * 0.05;
                } else if (pt < 0.3) {
                    // DUB xuống — ease-out
                    const progress = (pt - 0.22) / 0.08;
                    pBeat = 1.08 - Math.pow(progress, 0.6) * 0.08;
                } else {
                    // Nghỉ
                    pBeat = 1.0;
                }

                const driftX =
                    Math.sin(time * p.driftFreq + p.driftAngle) * p.driftSpeed;
                const driftY =
                    Math.cos(time * p.driftFreq + p.driftAngle) * p.driftSpeed;

                const beatStrength = 1 + (pBeat - 1) * (1 + p.depth * 2);
                const goalX =
                    canvas.width / 2 +
                    (p.targetX - canvas.width / 2) * beatStrength +
                    driftX;
                const beatY = 1 + (pBeat - 1) * 1.15 * (1 + p.depth * 2);
                const goalY =
                    canvas.height / 2 + (p.targetY - canvas.height / 2) * beatY + driftY;

                // Lực lò xo: kéo về phía đích
                p.vx = (goalX - p.x) * p.speed;
                p.vy = (goalY - p.y) * p.speed;

                // Ma sát: giảm tốc
                p.vx *= 0.92;
                p.vy *= 0.92;

                // Di chuyển
                p.x += p.vx;
                p.y += p.vy;

                // Vẽ hạt
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                // ctx.fillStyle = '#ff6b8f';
                // ctx.fillStyle = `rgba(255, 107, 143, ${p.alpha})`;
                // ctx.fillStyle = `rgba(220, 50, 80, ${p.alpha})`;
                ctx.fillStyle = `rgba(200, 70, 100, ${p.alpha})`;
                ctx.fill();
            }

            animationId = requestAnimationFrame(render);
        }

        render();

        window.addEventListener("resize", resize);

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener("resize", resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                width: "100vw",
                height: "100vh",
                position: "fixed",
                background: "#0d0d1a",
            }}
        />
    );
};

export default HeartCanvas;
