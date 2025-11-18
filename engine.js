/* --- JS FILE CONTENT START --- */
        /* Save this content as script.js */

        // --- Select DOM Elements ---
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        
        const startScreen = document.getElementById('start-screen');
        const gameOverScreen = document.getElementById('game-over-screen');
        const pauseScreen = document.getElementById('pause-screen');
        const hud = document.getElementById('hud');
        
        const scoreEl = document.getElementById('currentScore');
        const finalScoreEl = document.getElementById('finalScore');
        const bestScoreEl = document.getElementById('bestScore');
        const newRecordEl = document.getElementById('newRecord');

        const startBtn = document.getElementById('startBtn');
        const restartBtn = document.getElementById('restartBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const resumeBtn = document.getElementById('resumeBtn');

        // --- Game Variables ---
        let frames = 0;
        let score = 0;
        let highScore = localStorage.getItem('flappyHighScore') || 0;
        let gameState = 'START'; // 'START', 'PLAYING', 'PAUSED', 'GAMEOVER'
        let gameLoopId;

        // --- Game Constants ---
        const DEGREE = Math.PI / 180;
        const GRAVITY = 0.25;
        const FLAP_STRENGTH = -4.5;
        const PIPE_SPEED = 2;
        const PIPE_SPAWN_RATE = 100; // frames
        const PIPE_WIDTH = 52;
        const PIPE_GAP = 100;

        // --- Game Objects ---

        const bird = {
            x: 50,
            y: 150,
            w: 34,
            h: 26,
            radius: 12,
            speed: 0,
            rotation: 0,
            
            draw: function() {
                ctx.save();
                ctx.translate(this.x, this.y);
                // Rotate bird based on speed
                this.rotation = this.speed * 3 * DEGREE;
                // Clamp rotation
                if(this.rotation > 25 * DEGREE) this.rotation = 25 * DEGREE;
                if(this.rotation < -90 * DEGREE) this.rotation = -90 * DEGREE;
                
                ctx.rotate(this.rotation);
                
                // Draw Bird (Yellow Body)
                ctx.fillStyle = "#FFD700";
                ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
                // Outline
                ctx.strokeStyle = "#333";
                ctx.lineWidth = 2;
                ctx.strokeRect(-this.w/2, -this.h/2, this.w, this.h);
                // Eye
                ctx.fillStyle = "#FFF";
                ctx.fillRect(6, -10, 12, 12);
                ctx.strokeRect(6, -10, 12, 12);
                ctx.fillStyle = "#000";
                ctx.fillRect(14, -6, 4, 4);
                // Beak
                ctx.fillStyle = "#FF4500";
                ctx.fillRect(4, 4, 16, 8);
                ctx.strokeRect(4, 4, 16, 8);
                
                ctx.restore();
            },
            
            flap: function() {
                this.speed = FLAP_STRENGTH;
            },
            
            update: function() {
                this.speed += GRAVITY;
                this.y += this.speed;

                // Ceiling collision detection
                if (this.y + this.h/2 < 0) {
                    this.y = this.h/2;
                    this.speed = 0;
                }

                // Floor collision is handled in the main loop
            },

            reset: function() {
                this.y = 150;
                this.speed = 0;
                this.rotation = 0;
            }
        };

        const pipes = {
            position: [],
            
            draw: function() {
                for(let i = 0; i < this.position.length; i++){
                    let p = this.position[i];
                    let topY = p.y;
                    let bottomY = p.y + PIPE_GAP;
                    
                    // Draw Top Pipe
                    ctx.fillStyle = "#2E8B57"; // Green
                    ctx.fillRect(p.x, 0, PIPE_WIDTH, topY);
                    ctx.strokeStyle = "#333";
                    ctx.strokeRect(p.x, 0, PIPE_WIDTH, topY);
                    // Top Cap
                    ctx.fillRect(p.x - 2, topY - 20, PIPE_WIDTH + 4, 20);
                    ctx.strokeRect(p.x - 2, topY - 20, PIPE_WIDTH + 4, 20);
                    
                    // Draw Bottom Pipe
                    ctx.fillRect(p.x, bottomY, PIPE_WIDTH, canvas.height - bottomY - 20); // -20 for floor
                    ctx.strokeRect(p.x, bottomY, PIPE_WIDTH, canvas.height - bottomY - 20);
                    // Bottom Cap
                    ctx.fillRect(p.x - 2, bottomY, PIPE_WIDTH + 4, 20);
                    ctx.strokeRect(p.x - 2, bottomY, PIPE_WIDTH + 4, 20);
                }
            },
            
            update: function() {
                // Add new pipe
                if(frames % PIPE_SPAWN_RATE == 0){
                    // Calculate random position
                    // Available height: canvas.height - floor(20)
                    // We need to fit the GAP and some buffer
                    let minY = 50;
                    let maxY = canvas.height - 20 - PIPE_GAP - 50;
                    
                    this.position.push({
                        x: canvas.width,
                        y: Math.floor(Math.random() * (maxY - minY + 1)) + minY,
                        passed: false
                    });
                }
                
                for(let i = 0; i < this.position.length; i++){
                    let p = this.position[i];
                    p.x -= PIPE_SPEED;
                    
                    // Remove pipe if it goes off screen
                    if(p.x + PIPE_WIDTH <= 0){
                        this.position.shift();
                        // i decrement because array length changed
                        i--;
                        continue;
                    }
                    
                    // Collision Logic
                    // Pipe logic
                    let birdLeft = bird.x - bird.w/2 + 4;
                    let birdRight = bird.x + bird.w/2 - 4;
                    let birdTop = bird.y - bird.h/2 + 4;
                    let birdBottom = bird.y + bird.h/2 - 4;
                    
                    let pipeLeft = p.x;
                    let pipeRight = p.x + PIPE_WIDTH;
                    let topPipeBottom = p.y;
                    let bottomPipeTop = p.y + PIPE_GAP;
                    
                    // Check X overlap
                    if(birdRight > pipeLeft && birdLeft < pipeRight){
                        // Check Y overlap (hit top pipe OR hit bottom pipe)
                        if(birdTop < topPipeBottom || birdBottom > bottomPipeTop){
                            gameOver();
                        }
                    }
                    
                    // Score update
                    if(p.x + PIPE_WIDTH < bird.x && !p.passed){
                        score++;
                        scoreEl.innerText = score;
                        p.passed = true;
                    }
                }
            },
            
            reset: function() {
                this.position = [];
            }
        };

        const background = {
            draw: function(){
                // Floor
                ctx.fillStyle = "#D2B48C";
                ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
                // Floor Border
                ctx.beginPath();
                ctx.moveTo(0, canvas.height - 20);
                ctx.lineTo(canvas.width, canvas.height - 20);
                ctx.strokeStyle = "#333";
                ctx.stroke();
            }
        };

        // --- Control Functions ---

        function init() {
            // Event Listeners
            startBtn.addEventListener('click', startGame);
            restartBtn.addEventListener('click', startGame);
            
            pauseBtn.addEventListener('click', togglePause);
            resumeBtn.addEventListener('click', togglePause);
            
            // Controls (Space, Click, Touch)
            window.addEventListener('keydown', function(e){
                if(e.code === 'Space'){
                    e.preventDefault(); // prevent scrolling
                    action();
                }
                if(e.code === 'KeyP' || e.code === 'Escape') {
                    togglePause();
                }
            });
            
            canvas.addEventListener('mousedown', function(e){
                action();
            });
            
            canvas.addEventListener('touchstart', function(e){
                e.preventDefault();
                action();
            }, {passive: false});
            
            // Initial Render
            background.draw();
            bird.draw();
        }

        function action() {
            if (gameState === 'PLAYING') {
                bird.flap();
            }
        }

        function startGame() {
            bird.reset();
            pipes.reset();
            score = 0;
            frames = 0;
            scoreEl.innerText = score;
            
            // UI
            startScreen.classList.add('hidden');
            gameOverScreen.classList.add('hidden');
            pauseScreen.classList.add('hidden');
            hud.classList.remove('hidden');
            
            gameState = 'PLAYING';
            loop();
        }

        function togglePause() {
            if(gameState === 'PLAYING'){
                gameState = 'PAUSED';
                cancelAnimationFrame(gameLoopId);
                pauseScreen.classList.remove('hidden');
            } else if (gameState === 'PAUSED'){
                gameState = 'PLAYING';
                pauseScreen.classList.add('hidden');
                loop();
            }
        }

        function gameOver() {
            gameState = 'GAMEOVER';
            
            // High Score Logic
            if (score > highScore) {
                highScore = score;
                localStorage.setItem('flappyHighScore', highScore);
                newRecordEl.classList.remove('hidden');
            } else {
                newRecordEl.classList.add('hidden');
            }
            
            finalScoreEl.innerText = score;
            bestScoreEl.innerText = highScore;
            
            hud.classList.add('hidden');
            gameOverScreen.classList.remove('hidden');
        }

        function update() {
            bird.update();
            pipes.update();
            
            // Floor Collision
            if(bird.y + bird.h/2 >= canvas.height - 20){
                gameOver();
            }
            
            frames++;
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            background.draw();
            pipes.draw();
            bird.draw();
        }

        function loop() {
            if(gameState === 'PLAYING'){
                update();
                draw();
                gameLoopId = requestAnimationFrame(loop);
            }
        }

        // Start the game engine
        init();
        
        /* --- JS FILE CONTENT END --- */