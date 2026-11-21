document.addEventListener('keydown', event => {
 const scroller = event.target;
 if (!(scroller instanceof Element) || !scroller.matches('.table-scroll')) return;
 if (event.altKey || event.ctrlKey || event.metaKey || scroller.scrollWidth <= scroller.clientWidth) return;
 if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
 event.preventDefault();
 const distance = Math.min(scroller.clientWidth, 160);
 scroller.scrollBy({left: event.key === 'ArrowLeft' ? -distance : distance});
});
