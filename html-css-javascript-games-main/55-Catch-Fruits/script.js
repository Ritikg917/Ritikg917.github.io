$(function () {
    let playing = false;
    let score = 0;
    let trialsLeft = 3;
    let step;
    let action;
    const fruits = ['🍎', '🍌', '🍉', '🍇', '🍓', '🍍', '🍊', '🥝', '🍑'];

    // Web Audio Synthesizer for slice effect
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    function playSliceSound() {
        if (!audioCtx) return;
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
    }

    $("#startreset").click(function () {
        if (playing) {
            location.reload();
        } else {
            playing = true;
            score = 0;
            $("#scorevalue").html(score);
            $("#trialsLeft").show();
            trialsLeft = 3;
            addHearts();
            $("#gameOver").hide();
            $("#startreset").html("Reset Game");
            startAction();
        }
    });

    $("#fruit1").mouseover(sliceFruit);
    $("#fruit1").on("touchstart", sliceFruit);

    function sliceFruit() {
        if (!playing) return;
        score++;
        $("#scorevalue").html(score);
        playSliceSound();

        clearInterval(action);
        $("#fruit1").addClass("sliced");

        setTimeout(function () {
            $("#fruit1").removeClass("sliced");
            $("#fruit1").hide();
            setTimeout(startAction, 400);
        }, 200);
    }

    function addHearts() {
        $("#trialsLeft").empty();
        for (let i = 0; i < trialsLeft; i++) {
            $("#trialsLeft").append('<span class="heart">❤️</span>');
        }
    }

    function startAction() {
        $("#fruit1").show();
        chooseFruit();
        $("#fruit1").css({
            left: Math.round(Math.random() * 500),
            top: -50
        });

        step = 2 + Math.round(5 * Math.random());

        action = setInterval(function () {
            $("#fruit1").css("top", $("#fruit1").position().top + step);

            if ($("#fruit1").position().top > $("#container").height() - 60) {
                if (trialsLeft > 1) {
                    $("#fruit1").show();
                    chooseFruit();
                    $("#fruit1").css({
                        left: Math.round(Math.random() * 500),
                        top: -50
                    });
                    step = 2 + Math.round(5 * Math.random());
                    trialsLeft--;
                    addHearts();
                } else {
                    playing = false;
                    $("#startreset").html("Start Game");
                    $("#gameOver").show();
                    $("#finalScore").html(score);
                    $("#trialsLeft").hide();
                    clearInterval(action);
                }
            }
        }, 15);
    }

    function chooseFruit() {
        const randomFruit = fruits[Math.floor(Math.random() * fruits.length)];
        $("#fruit1").text(randomFruit);
    }
});
