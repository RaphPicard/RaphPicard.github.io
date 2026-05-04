function fitProjectImg(img) {
  const wrap = img.closest('.project-img-wrap');
  if (!wrap || !img.naturalWidth || !img.naturalHeight) return;
  if (img.closest('.project-card.featured')) return;
  wrap.style.aspectRatio = img.naturalWidth + ' / ' + img.naturalHeight;
}
document.querySelectorAll('.project-img').forEach(img => {
  if (img.complete) fitProjectImg(img);
  else img.addEventListener('load', () => fitProjectImg(img));
});
