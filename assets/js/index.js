(function() {
            'use strict';

            const atmosphere = document.getElementById('atmosphere');
            const beam = document.getElementById('beam');
            const depthLayer = document.getElementById('depthLayer');
            const swooshContainer = document.getElementById('swooshContainer');
            const promptText = document.getElementById('promptText');
            const thresholdPrompt = document.getElementById('thresholdPrompt');

            const stageSplash = document.getElementById('stageSplash');
            const splashTitle = document.getElementById('splashTitle');
            const splashTagline = document.getElementById('splashTagline');

            const stagePhilosophy = document.getElementById('stagePhilosophy');
            const philosophyWord = document.getElementById('philosophyWord');

            const stageCurator = document.getElementById('stageCurator');
            const curatorLine = document.getElementById('curatorLine');

            const stageThreshold = document.getElementById('stageThreshold');
            const thresholdLogo = document.getElementById('thresholdLogo');
            const thresholdSubtitle = document.getElementById('thresholdSubtitle');

            let hasTransitioned = false;
            const isMobile = window.matchMedia('(pointer: coarse)').matches;
            promptText.textContent = isMobile ? 'Swipe to Begin' : 'Scroll Forward';

            function wait(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            }

            function showElement(el, className = 'visible') {
                el.classList.add(className);
            }

            function hideElement(el, className = 'visible') {
                el.classList.remove(className);
            }

            // ====== STAGE 1: SPLASH ======
            async function runSplash() {
                atmosphere.classList.add('active');
                await wait(100);
                showElement(splashTitle);
                await wait(3000);
                showElement(splashTagline);
                await wait(3500);

                stageSplash.classList.add('exit');
                await wait(1200);
                stageSplash.classList.remove('active', 'exit');
                hideElement(splashTitle);
                hideElement(splashTagline);

                runPhilosophy();
            }

            // ====== STAGE 2: PHILOSOPHY ======
            async function runPhilosophy() {
                const words = ['Remember.', 'Witness.', 'Vestige.'];
                stagePhilosophy.classList.add('active');

                for (const word of words) {
                    philosophyWord.textContent = word;
                    showElement(philosophyWord);
                    await wait(2500);
                    philosophyWord.classList.add('exit');
                    await wait(1200);
                    hideElement(philosophyWord);
                    philosophyWord.classList.remove('exit');
                    await wait(300);
                }

                stagePhilosophy.classList.remove('active');
                runCurator();
            }

            // ====== STAGE 3: CURATOR ======
            async function runCurator() {
                const lines = [
                    'You are not here to observe history.',
                    'You are here to listen to it.'
                ];
                stageCurator.classList.add('active');

                for (let i = 0; i < lines.length; i++) {
                    curatorLine.textContent = lines[i];
                    showElement(curatorLine);
                    await wait(i === 0 ? 3000 : 3500);
                    curatorLine.classList.add('exit');
                    await wait(1000);
                    hideElement(curatorLine);
                    curatorLine.classList.remove('exit');
                    await wait(400);
                }

                stageCurator.classList.remove('active');
                runThreshold();
            }

            // ====== STAGE 4: THRESHOLD ======
            async function runThreshold() {
                stageThreshold.classList.add('active');
                beam.classList.add('active');
                await wait(600);
                showElement(thresholdLogo);
                await wait(2500);
                showElement(thresholdSubtitle);
                await wait(2000);
                thresholdPrompt.classList.add('visible');
            }

            // ====== ENTER ARCHIVE -> vestige.html ======
            async function enterArchive() {
                if (hasTransitioned) return;
                hasTransitioned = true;

                thresholdPrompt.classList.remove('visible');
                thresholdSubtitle.classList.remove('visible');
                thresholdLogo.style.transition = 'opacity 1.5s ease, letter-spacing 3s ease, filter 2s ease';
                thresholdLogo.style.letterSpacing = '0.6em';
                thresholdLogo.style.opacity = '0.12';
                thresholdLogo.style.filter = 'blur(1px)';
                beam.classList.add('bright');

                await wait(1800);
                swooshContainer.classList.add('active');
                await wait(2000);

                stageThreshold.classList.add('exit');
                depthLayer.classList.add('active');
                await wait(2000);

                document.body.style.cursor = 'none';
                beam.style.opacity = '0';
                await wait(2500);

                // Navigate to vestige.html
                window.location.href = 'vestige.html';
            }

            // ====== EVENT LISTENERS ======
            thresholdPrompt.addEventListener('click', enterArchive);

            let scrollAccumulator = 0;
            window.addEventListener('wheel', (e) => {
                if (!thresholdPrompt.classList.contains('visible') || hasTransitioned) return;
                scrollAccumulator += Math.abs(e.deltaY);
                if (scrollAccumulator > 80) {
                    enterArchive();
                }
            }, { passive: true });

            let touchStartY = 0;
            window.addEventListener('touchstart', (e) => {
                touchStartY = e.touches[0].clientY;
            }, { passive: true });

            window.addEventListener('touchend', (e) => {
                if (!thresholdPrompt.classList.contains('visible') || hasTransitioned) return;
                const touchEndY = e.changedTouches[0].clientY;
                const diff = touchStartY - touchEndY;
                if (diff > 50) {
                    enterArchive();
                }
            }, { passive: true });

            thresholdPrompt.addEventListener('mouseenter', () => {
                beam.classList.add('bright');
            });
            thresholdPrompt.addEventListener('mouseleave', () => {
                if (!hasTransitioned) beam.classList.remove('bright');
            });

            // ====== START ======
            runSplash();
        })();