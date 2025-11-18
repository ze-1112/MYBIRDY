        /* --- JS FILE CONTENT START --- */
        /* Save this content as script.js */

        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        
        // UI Elements
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

        // State Variables
        let score = 0;
        let highScore = localStorage.getItem('flappyHighScore') || 0;
        let gameState = 'START'; 
        let gameLoopId;
        
        // Time Handling (Delta Time)
        let lastTime = 0;
        let accumulatedTime = 0;

        // Game Constants (Normalized for 60FPS)
        // If delta is 1.0, these are the values applied per frame
        const GRAVITY = 0.35;         
        const FLAP_STRENGTH = -5.8;  
        const SPEED = 3.0; // Pixels per 'unit' of time       
        const PIPE_SPAWN_DISTANCE = 200; // Pixels between pipes
        const PIPE_WIDTH = 52;
        const PIPE_GAP = 110;      
        const DEGREE = Math.PI / 180;

        const bird = {
            x: 50,
            y: 150,
            w: 34,
            h: 26,
            velocity: 0,
            rotation: 0,
            hoverOffset: 0,
            
            draw: function() {
                ctx.save();
                ctx.translate(this.x, this.y);
                
                if (gameState === 'GET_READY') {
                    this.rotation = 0;
                } else {
                    this.rotation = this.velocity * 3 * DEGREE;
                    if(this.rotation > 25 * DEGREE) this.rotation = 25 * DEGREE;
                    if(this.rotation < -90 * DEGREE) this.rotation = -90 * DEGREE;
                }
                
                ctx.rotate(this.rotation);
                
                // Draw Bird
                ctx.fillStyle = "#FFD700"; 
                ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
                ctx.strokeStyle = "#333";
                ctx.lineWidth = 2;
                ctx.strokeRect(-this.w/2, -this.h/2, this.w, this.h);
                ctx.fillStyle = "#FFF";
                ctx.fillRect(6, -10, 12, 12);
                ctx.strokeRect(6, -10, 12, 12);
                ctx.fillStyle = "#000";
                ctx.fillRect(14, -6, 4, 4);
                ctx.fillStyle = "#FF4500";
                ctx.fillRect(4, 4, 16, 8);
                ctx.strokeRect(4, 4, 16, 8);
                
                ctx.restore();
            },
            
            flap: function() {
                this.velocity = FLAP_STRENGTH;
            },
            
            update: function(delta) {
                if (gameState === 'GET_READY') {
                    // Hover effect independent of delta for smoothness
                    this.hoverOffset += 0.1 * delta;
                    this.y = 150 + Math.sin(this.hoverOffset) * 5;
                    this.velocity = 0;
                    this.rotation = 0;
                } else {
                    this.velocity += GRAVITY * delta;
                    this.y += this.velocity * delta;

                    // Ceiling Check
                    if (this.y + this.h/2 < 0) {
                        this.y = this.h/2;
                        this.velocity = 0;
                    }
                }
            },

            reset: function() {
                this.y = 150;
                this.velocity = 0;
                this.rotation = 0;
            }
        };

        const pipes = {
            items: [],
            distanceSinceLastPipe: 0,
            
            draw: function() {
                for(let i = 0; i < this.items.length; i++){
                    let p = this.items[i];
                    let topY = p.y;
                    let bottomY = p.y + PIPE_GAP;
                    
                    // Top Pipe
                    ctx.fillStyle = "#2E8B57";
                    ctx.fillRect(p.x, 0, PIPE_WIDTH, topY);
                    ctx.strokeStyle = "#333";
                    ctx.lineWidth = 2;
                    ctx.strokeRect(p.x, 0, PIPE_WIDTH, topY);
                    // Cap
                    ctx.fillRect(p.x - 2, topY - 20, PIPE_WIDTH + 4, 20);
                    ctx.strokeRect(p.x - 2, topY - 20, PIPE_WIDTH + 4, 20);
                    
                    // Bottom Pipe
                    ctx.fillRect(p.x, bottomY, PIPE_WIDTH, canvas.height - bottomY - 20); 
                    ctx.strokeRect(p.x, bottomY, PIPE_WIDTH, canvas.height - bottomY - 20);
                    // Cap
                    ctx.fillRect(p.x - 2, bottomY, PIPE_WIDTH + 4, 20);
                    ctx.strokeRect(p.x - 2, bottomY, PIPE_WIDTH + 4, 20);
                }
            },
            
            update: function(delta) {
                if(gameState !== 'PLAYING') return;

                // Move pipes based on delta time
                const moveAmount = SPEED * delta;
                
                for(let i = 0; i < this.items.length; i++){
                    let p = this.items[i];
                    p.x -= moveAmount;
                }
                
                // Spawn Logic based on distance traveled
                this.distanceSinceLastPipe += moveAmount;
                
                if(this.distanceSinceLastPipe >= PIPE_SPAWN_DISTANCE) {
                    this.distanceSinceLastPipe = 0;
                    
                    let minY = 50;
                    let maxY = canvas.height - 20 - PIPE_GAP - 50;
                    
                    this.items.push({
                        x: canvas.width,
                        y: Math.floor(Math.random() * (maxY - minY + 1)) + minY,
                        passed: false
                    });
                }

                // Cleanup and Collision
                for(let i = 0; i < this.items.length; i++){
                    let p = this.items[i];
                    
                    if(p.x + PIPE_WIDTH <= 0){
                        this.items.shift();
                        i--;
                        continue;
                    }
                    
                    // Collision
                    let birdLeft = bird.x - bird.w/2 + 4;
                    let birdRight = bird.x + bird.w/2 - 4;
                    let birdTop = bird.y - bird.h/2 + 4;
                    let birdBottom = bird.y + bird.h/2 - 4;
                    
                    if(birdRight > p.x && birdLeft < p.x + PIPE_WIDTH){
                        if(birdTop < p.y || birdBottom > p.y + PIPE_GAP){
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
                this.items = [];
                this.distanceSinceLastPipe = 0;
            }
        };

        const background = {
            totalDist: 0,
            draw: function(){
                // Floor
                ctx.fillStyle = "#D2B48C";
                ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
                
                ctx.beginPath();
                ctx.strokeStyle = "#A0522D";
                ctx.lineWidth = 2;
                
                // Animate floor
                let offset = this.totalDist % 20;
                for(let i = 0; i <= canvas.width + 20; i+=20) {
                    let x = i - offset;
                    ctx.moveTo(x, canvas.height - 20);
                    ctx.lineTo(x - 10, canvas.height);
                }
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(0, canvas.height - 20);
                ctx.lineTo(canvas.width, canvas.height - 20);
                ctx.strokeStyle = "#333";
                ctx.stroke();
            },
            update: function(delta) {
                if(gameState === 'PLAYING' || gameState === 'GET_READY') {
                    this.totalDist += SPEED * delta;
                }
            }
        };

        // --- Engine ---

        function init() {
            startBtn.addEventListener('click', setGetReadyState);
            restartBtn.addEventListener('click', setGetReadyState);
            pauseBtn.addEventListener('click', togglePause);
            resumeBtn.addEventListener('click', togglePause);
            
            window.addEventListener('keydown', function(e){
                if(e.code === 'Space'){ e.preventDefault(); handleInput(); }
                if(e.code === 'KeyP' || e.code === 'Escape') { togglePause(); }
            });
            
            canvas.addEventListener('mousedown', handleInput);
            canvas.addEventListener('touchstart', function(e){
                e.preventDefault();
                handleInput();
            }, {passive: false});
            
            // Start the loop
            requestAnimationFrame(loop);
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
            scoreEl.innerText = score;
            
            startScreen.classList.add('hidden');
            gameOverScreen.classList.add('hidden');
            pauseScreen.classList.add('hidden');
            hud.classList.remove('hidden');
            getReadyOverlay.classList.remove('hidden');
            
            gameState = 'GET_READY';
            lastTime = performance.now();
        }

        function togglePause() {
            if(gameState === 'PLAYING'){
                gameState = 'PAUSED';
                pauseScreen.classList.remove('hidden');
            } else if (gameState === 'PAUSED'){
                gameState = 'PLAYING';
                pauseScreen.classList.add('hidden');
                lastTime = performance.now(); // Reset time to prevent huge delta jump
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

        function loop(timestamp) {
            // Calculate Delta Time
            const deltaTime = timestamp - lastTime;
            lastTime = timestamp;
            
            // Normalize delta: 1.0 = 60fps (16.66ms)
            // Cap at 2.0 (30fps) to prevent spiraling physics if lag occurs
            let delta = deltaTime / 16.667;
            if (delta > 2) delta = 2; 
            // If paused or just starting, delta might be weird, fix it
            if (isNaN(delta)) delta = 1;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if(gameState !== 'PAUSED') {
                background.update(delta);
                bird.update(delta);
                pipes.update(delta);
                
                if(bird.y + bird.h/2 >= canvas.height - 20){
                    if(gameState === 'PLAYING' || gameState === 'GET_READY') gameOver();
                }
            }

            background.draw();
            pipes.draw();
            bird.draw();
            
            requestAnimationFrame(loop);
        }

        init();
        
        /* --- JS FILE CONTENT END --- */
