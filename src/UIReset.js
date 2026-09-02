const resetCardHighlight=()=>document.querySelectorAll('.unit-card').forEach(card=>{
  card.classList.toggle('selected',card.dataset.unit==='atc');
});

document.querySelector('#start-button').addEventListener('click',resetCardHighlight);
addEventListener('keydown',event=>{
  if(event.key.toLowerCase()==='r')resetCardHighlight();
});
