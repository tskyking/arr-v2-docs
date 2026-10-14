(() => {
  const opener = document.getElementById('arr-intro-open');
  const dialog = document.getElementById('arr-intro-dialog');
  const video = document.getElementById('arr-intro-video');
  const closeButton = document.getElementById('arr-intro-close');
  const stopButton = document.getElementById('arr-intro-stop');
  if (!opener || !dialog || !video || !closeButton || !stopButton) return;

  let closing = false;
  let playbackStarted = false;

  function closeVideo() {
    if (!dialog.open) return;
    closing = true;
    video.pause();
    try { video.currentTime = 0; } catch (_) {}
    dialog.close();
    document.body.classList.remove('arr-intro-open');
    playbackStarted = false;
    closing = false;
    opener.focus();
  }

  function openVideo() {
    playbackStarted = false;
    try { video.currentTime = 0; } catch (_) {}
    dialog.showModal();
    document.body.classList.add('arr-intro-open');
    const attempt = video.play();
    if (attempt && typeof attempt.catch === 'function') attempt.catch(() => {});
  }

  opener.addEventListener('click', openVideo);
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
