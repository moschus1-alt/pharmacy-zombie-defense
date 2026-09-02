Game.prototype.pointer=function(px,py){
  if(!this.running||this.paused||this.over)return;
  const drop=this.drops.find(item=>Math.hypot(item.x-px,item.y-py)<42);
  if(drop){
    drop.dead=true;
    this.money+=drop.value;
    audio.sfx('collect');
    ui.message.textContent=`원화 아이템 +${drop.value}원`;
    this.sync();
    return;
  }
  const col=Math.floor((px-GRID.x)/GRID.cw);
  const row=Math.floor((py-GRID.y)/GRID.ch);
  if(row<0||row>=GRID.rows||col<0||col>=GRID.cols)return;
  const type=UNIT_TYPES[this.selected];
  if(this.units.some(unit=>unit.row===row&&unit.col===col)){
    ui.message.textContent='이미 사용 중인 자리입니다.';
    return;
  }
  if(this.money<type.cost){
    ui.message.textContent=`${type.cost-this.money}원이 더 필요합니다. 원화 아이템을 클릭하세요!`;
    return;
  }
  this.money-=type.cost;
  this.units.push(new Unit(this.selected,row,col));
  audio.sfx('place');
  ui.message.textContent=type.lanes===3
    ?`${type.name} 배치 완료 · 인접한 3개 라인을 공격합니다.`
    :`${type.name} 배치 완료`;
  this.sync();
};
