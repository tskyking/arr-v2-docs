(() => {
  const openers = [...document.querySelectorAll('[data-arr-video]')];
  const dialog = document.getElementById('arr-intro-dialog');
  const video = document.getElementById('arr-intro-video');
  const source = document.getElementById('arr-intro-source');
  const title = document.getElementById('arr-intro-title');
  const eyebrow = document.getElementById('arr-intro-eyebrow');
  const closeButton = document.getElementById('arr-intro-close');
  const stopButton = document.getElementById('arr-intro-stop');
  if (!openers.length || !dialog || !video || !source || !title || !eyebrow || !closeButton || !stopButton) return;

  let closing = false;
  let playbackStarted = false;
  let currentOpener = null;

  function closeVideo() {
    if (!dialog.open) return;
    closing = true;
    video.pause();
    try { video.currentTime = 0; } catch (_) {}
    source.removeAttribute('src');
    video.load();
    dialog.close();
    document.body.classList.remove('arr-intro-open');
    playbackStarted = false;
    closing = false;
    const focusTarget = currentOpener;
    currentOpener = null;
    focusTarget?.focus();
  }

  function openVideo(event) {
    const opener = event.currentTarget;
    const nextSource = opener.dataset.videoSrc;
    if (!nextSource) return;
    currentOpener = opener;
    title.textContent = opener.dataset.videoTitle || 'ARR presentation';
    eyebrow.textContent = opener.dataset.videoEyebrow || 'Fictional demonstration';
    if (source.getAttribute('src') !== nextSource) {
      video.pause();
      source.setAttribute('src', nextSource);
      video.load();
    }
    playbackStarted = false;
    try { video.currentTime = 0; } catch (_) {}
    dialog.showModal();
    document.body.classList.add('arr-intro-open');
    const attempt = video.play();
    if (attempt && typeof attempt.catch === 'function') attempt.catch(() => {});
  }

  for (const opener of openers) opener.addEventListener('click', openVideo);
  closeButton.addEventListener('click', closeVideo);
  stopButton.addEventListener('click', closeVideo);
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeVideo();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeVideo();
  });
  video.addEventListener('play', () => { playbackStarted = true; });
  video.addEventListener('pause', () => {
    if (playbackStarted && !closing && dialog.open) closeVideo();
  });
  video.addEventListener('ended', closeVideo);
})();
