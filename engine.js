        /* --- JS FILE CONTENT START --- */
        /* Save this content as script.js */

        // --- Select DOM Elements ---
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        
        const startScreen = document.getElementById('start-screen');
        const gameOverScreen = document.getElementById('game-over-screen');
        const pauseScreen = document.getElementById('pause-screen');
        const hud = document.getElementById('hud');
        const getReadyOverlay = document.getElementById('get-ready-overlay');
        
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
        
        // States: START, GET_READY, PLAYING, PAUSED, GAMEOVER
        let gameState = 'START'; 
        let gameLoopId;

        // --- Game Constants (Optimized for speed) ---
        const DEGREE = Math.PI / 180;
        const GRAVITY = 0.4;         
        const FLAP_STRENGTH = -6.2;  
        const PIPE_SPEED = 3.0;       
        const PIPE_SPAWN_RATE = 75; 
        const PIPE_WIDTH = 52;
        const PIPE_GAP = 110;      

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
                
                // Rotation logic
                if (gameState === 'GET_READY') {
                    this.rotation = 0;
                } else {
                    this.rotation = this.speed * 3 * DEGREE;
                    if(this.rotation > 25 * DEGREE) this.rotation = 25 * DEGREE;
                    if(this.rotation < -90 * DEGREE) this.rotation = -90 * DEGREE;
                }
                
                ctx.rotate(this.rotation);
                
                // Body
                ctx.fillStyle = "#FFD700"; // Gold
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
                // If in Get Ready state, hover gently
                if (gameState === 'GET_READY') {
                    // Simple sine wave hover
                    this.y = 150 + Math.sin(frames * 0.1) * 5;
                    this.speed = 0;
                    this.rotation = 0;
                } else {
                    // Normal physics
                    this.speed += GRAVITY;
                    this.y += this.speed;

                    // Ceiling Check
                    if (this.y + this.h/2 < 0) {
                        this.y = this.h/2;
                        this.speed = 0;
                    }
                }
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
                    
                    // Top Pipe
                    ctx.fillStyle = "#2E8B57";
                    ctx.fillRect(p.x, 0, PIPE_WIDTH, topY);
                    ctx.strokeStyle = "#333";
                    ctx.lineWidth = 2;
                    ctx.strokeRect(p.x, 0, PIPE_WIDTH, topY);
                    // Top Cap
                    ctx.fillRect(p.x - 2, topY - 20, PIPE_WIDTH + 4, 20);
                    ctx.strokeRect(p.x - 2, topY - 20, PIPE_WIDTH + 4, 20);
                    
                    // Bottom Pipe
                    ctx.fillRect(p.x, bottomY, PIPE_WIDTH, canvas.height - bottomY - 20); 
                    ctx.strokeRect(p.x, bottomY, PIPE_WIDTH, canvas.height - bottomY - 20);
                    // Bottom Cap
                    ctx.fillRect(p.x - 2, bottomY, PIPE_WIDTH + 4, 20);
                    ctx.strokeRect(p.x - 2, bottomY, PIPE_WIDTH + 4, 20);
                }
            },
            
            update: function() {
                if(gameState !== 'PLAYING') return;

                // Add new pipe
                if(frames % PIPE_SPAWN_RATE == 0){
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
                    
                    if(p.x + PIPE_WIDTH <= 0){
                        this.position.shift();
                        i--;
                        continue;
                    }
                    
                    // Collision Logic
                    let birdLeft = bird.x - bird.w/2 + 4;
                    let birdRight = bird.x + bird.w/2 - 4;
                    let birdTop = bird.y - bird.h/2 + 4;
                    let birdBottom = bird.y + bird.h/2 - 4;
                    
                    let pipeLeft = p.x;
                    let pipeRight = p.x + PIPE_WIDTH;
                    let topPipeBottom = p.y;
                    let bottomPipeTop = p.y + PIPE_GAP;
                    
                    if(birdRight > pipeLeft && birdLeft < pipeRight){
                        if(birdTop < topPipeBottom || birdBottom > bottomPipeTop){
                            gameOver();
                        }
                    }
                    
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
                
                // Moving floor effect
                ctx.beginPath();
                ctx.strokeStyle = "#A0522D";
                ctx.lineWidth = 2;
                
                // Move floor texture based on frame count
                let offset = (frames * PIPE_SPEED) % 20;
                
                for(let i = 0; i <= canvas.width + 20; i+=20) {
                    let x = i - offset;
                    ctx.moveTo(x, canvas.height - 20);
                    ctx.lineTo(x - 10, canvas.height);
                }
                ctx.stroke();

                // Floor Top Border
                ctx.beginPath();
                ctx.moveTo(0, canvas.height - 20);
                ctx.lineTo(canvas.width, canvas.height - 20);
                ctx.strokeStyle = "#333";
                ctx.stroke();
            }
        };

        // --- Control Functions ---

        function init() {
            // UI Buttons
            startBtn.addEventListener('click', setGetReadyState);
            restartBtn.addEventListener('click', setGetReadyState);
            
            pauseBtn.addEventListener('click', togglePause);
            resumeBtn.addEventListener('click', togglePause);
            
            // Input Handling
            window.addEventListener('keydown', function(e){
                if(e.code === 'Space'){
                    e.preventDefault(); 
                    handleInput();
                }
                if(e.code === 'KeyP' || e.code === 'Escape') {
                    togglePause();
                }
            });
            
            canvas.addEventListener('mousedown', function(e){
                handleInput();
            });
            
            canvas.addEventListener('touchstart', function(e){
                e.preventDefault();
                handleInput();
            }, {passive: false});
            
            // Initial Draw
            background.draw();
            bird.draw();
        }

        function handleInput() {
            if (gameState === 'GET_READY') {
                gameState = 'PLAYING';
                getReadyOverlay.classList.add('hidden');
                bird.flap();
            } else if (gameState === 'PLAYING') {
                bird.flap();
            }
        }

        function setGetReadyState() {
            bird.reset();
            pipes.reset();
            score = 0;
            frames = 0;
            scoreEl.innerText = score;
            
            // Hide Screens
            startScreen.classList.add('hidden');
            gameOverScreen.classList.add('hidden');
            pauseScreen.classList.add('hidden');
            
            // Show HUD and Ready Message
            hud.classList.remove('hidden');
            getReadyOverlay.classList.remove('hidden');
            
            gameState = 'GET_READY';
            
            // Ensure loop is running if we were stopped
            if(!gameLoopId) loop();
        }

        function togglePause() {
            if(gameState === 'PLAYING'){
                gameState = 'PAUSED';
                pauseScreen.classList.remove('hidden');
            } else if (gameState === 'PAUSED'){
                gameState = 'PLAYING';
                pauseScreen.classList.add('hidden');
                // No need to call loop() here as requestAnimationFrame usually handles it,
                // but if using cancelAnimationFrame logic, we'd restart it.
                // In this implementation we just pause 'update' logic but keep drawing.
            }
        }

        function gameOver() {
            gameState = 'GAMEOVER';
            
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
            getReadyOverlay.classList.add('hidden');
            gameOverScreen.classList.remove('hidden');
        }

        function update() {
            // Background updates (moving floor)
            if(gameState === 'PLAYING' || gameState === 'GET_READY') {
                // We update frames to animate floor
            }

            bird.update();
            pipes.update();
            
            // Floor Collision
            if(bird.y + bird.h/2 >= canvas.height - 20){
                if(gameState === 'PLAYING' || gameState === 'GET_READY') {
                    gameOver();
                }
            }
            
            if(gameState === 'PLAYING' || gameState === 'GET_READY') {
                 frames++;
            }
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            background.draw();
            pipes.draw();
            bird.draw();
        }

        function loop() {
            if(gameState !== 'PAUSED') {
                update();
                draw();
            }
            gameLoopId = requestAnimationFrame(loop);
        }

        // Start
        init();
        
        /* --- JS FILE CONTENT END --- */
    
