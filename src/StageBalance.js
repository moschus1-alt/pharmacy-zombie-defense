const STAGE_TOTAL=5;
const BUILDING_OWNER={id:'building-owner',name:'건물주',emoji:'🔑',hp:420,speed:11,damage:46,reward:60,color:'#7d2638'};
ENEMY_TYPES.push(BUILDING_OWNER);

const STAGES=[
  {name:'오전 민원',count:4,interval:1.0,pool:[0,1],newcomers:[0,1],notice:'기본 진상 등장'},
  {name:'가족 손님',count:5,interval:.95,pool:[0,1,2,3],newcomers:[2,3],notice:'신규 적 · 어린이와 노인'},
  {name:'임대료 독촉',count:5,interval:.9,pool:[0,1,2,3],newcomers:[7],notice:'신규 적 · 건물주'},
  {name:'전문직 압박',count:6,interval:.85,pool:[0,1,2,3,4,5,7],newcomers:[4,5],notice:'신규 적 · 의사와 영업사원'},
  {name:'폐점 위기',count:7,interval:.8,pool:[0,1,2,3,4,5,6,7],newcomers:[6,7],notice:'최종 적 · 의사좀비와 건물주'}
];

Object.assign(UNIT_TYPES.atc,{cost:45,hp:340,interval:6.2});
Object.assign(UNIT_TYPES['atc-strike'],{cost:150,hp:290,damage:40,rate:1.25});
Object.assign(UNIT_TYPES['pharm-part'],{cost:60,hp:230,damage:22,rate:1.05});
Object.assign(UNIT_TYPES['pharm-new'],{cost:100,hp:280,damage:32,rate:.8});
Object.assign(UNIT_TYPES['pharm-vet'],{cost:160,hp:350,damage:58,rate:.72});
Object.assign(UNIT_TYPES['staff-part'],{cost:40,hp:480});
Object.assign(UNIT_TYPES['staff-new'],{cost:80,hp:850});
Object.assign(UNIT_TYPES['staff-vet'],{cost:120,hp:1400});

const stageName=document.querySelector('#stage-name');
const originalReset=Game.prototype.reset;
Game.prototype.reset=function(){
  originalReset.call(this);
  this.stage=1;
  this.wave=1;
  this.money=300;
  this.stageTimer=3.5;
  this.stageIntro=0;
  this.sync();
};

Game.prototype.prepareWave=function(){
  const config=STAGES[this.stage-1];
  const randomCount=Math.max(0,config.count-config.newcomers.length);
  const lineup=Array.from({length:randomCount},()=>config.pool[Math.floor(Math.random()*config.pool.length)]).concat(config.newcomers);
  this.spawnQueue=lineup.map((enemyIndex,index)=>({delay:index*config.interval,type:ENEMY_TYPES[enemyIndex]}));
  this.spawnClock=0;
  this.stageTimer=3.5;
  this.stageIntro=2.1;
  ui.message.textContent=`스테이지 ${this.stage} · ${config.name} — ${config.notice}`;
};

Game.prototype.update=function(dt){
  if(!this.running||this.paused||this.over)return;
  this.stageIntro=Math.max(0,this.stageIntro-dt);
  this.spawnClock+=dt;
  while(this.spawnQueue.length&&this.spawnClock>=this.spawnQueue[0].delay){
    const spawn=this.spawnQueue.shift();
    this.enemies.push(new Enemy(spawn.type,Math.floor(Math.random()*GRID.rows),this.stage-1));
  }
  this.dropTimer-=dt;
  if(this.dropTimer<=0){
    const drop=new Drop(GRID.x+60+Math.random()*(GRID.cw*GRID.cols-120),0);
    drop.value=30;
    this.drops.push(drop);
    this.dropTimer=4.5+Math.random()*2;
  }
  this.units.forEach(unit=>unit.update(dt,this));
  this.enemies.forEach(enemy=>enemy.update(dt,this));
  this.drops.forEach(drop=>drop.update(dt));
  this.shots.forEach(shot=>{
    shot.x+=shot.speed*dt;
    const hit=this.enemies.find(enemy=>enemy.row===shot.row&&Math.abs(enemy.x-shot.x)<29);
    if(hit){
      hit.hp-=shot.damage;
      hit.hit=.1;
      shot.dead=true;
      audio.sfx('hit');
    }
    if(shot.x>canvas.width+40)shot.dead=true;
  });
  const killed=this.enemies.filter(enemy=>enemy.hp<=0);
  killed.forEach(enemy=>this.money+=enemy.reward);
  this.enemies=this.enemies.filter(enemy=>enemy.hp>0);
  this.units=this.units.filter(unit=>unit.hp>0);
  this.drops=this.drops.filter(drop=>!drop.dead);
  this.shots=this.shots.filter(shot=>!shot.dead);
  if(!this.spawnQueue.length&&!this.enemies.length){
    this.stageTimer-=dt;
    if(this.stageTimer<=0){
      if(this.stage>=STAGE_TOTAL)this.win();
      else{
        const clearBonus=35+this.stage*10;
        this.money+=clearBonus;
        this.stage++;
        this.wave=this.stage;
        this.prepareWave();
        audio.sfx('wave');
      }
    }
  }else this.stageTimer=3.5;
  this.sync();
};

Game.prototype.sync=function(){
  const config=STAGES[(this.stage||1)-1];
  ui.money.textContent=Math.floor(this.money||0);
  ui.wave.textContent=this.stage||1;
  if(stageName)stageName.textContent=config.name;
  if(!this.running&&!this.over){ui.next.textContent=`스테이지 ${this.stage||1} 준비`;return;}
  if(this.spawnQueue?.length)ui.next.textContent=`${config.name} · 남은 적 ${this.spawnQueue.length+this.enemies.length}명`;
  else if(this.enemies?.length)ui.next.textContent=`${config.name} · 전투 중 ${this.enemies.length}명`;
  else ui.next.textContent=this.stage>=STAGE_TOTAL?'마지막 스테이지':`다음 스테이지 ${Math.max(0,Math.ceil(this.stageTimer||0))}초`;
};

Game.prototype.win=function(){
  this.finish(true,'5스테이지 영업 종료 성공!','건물주와 의사좀비까지 막았습니다. 짧고 굵은 오늘의 방어 영업 완료!');
};

const originalGameDraw=Game.prototype.draw;
Game.prototype.draw=function(){
  originalGameDraw.call(this);
  if(this.stageIntro>0){
    const config=STAGES[this.stage-1];
    const alpha=Math.min(1,this.stageIntro*1.5);
    ctx.save();
    ctx.globalAlpha=alpha;
    ctx.fillStyle='#072932e8';
    ctx.beginPath();
    ctx.roundRect(310,245,460,132,22);
    ctx.fill();
    ctx.strokeStyle='#6df0cd';
    ctx.lineWidth=3;
    ctx.stroke();
    ctx.textAlign='center';
    ctx.fillStyle='#70f2cf';
    ctx.font='900 20px sans-serif';
    ctx.fillText(`STAGE ${this.stage} / ${STAGE_TOTAL}`,540,282);
    ctx.fillStyle='white';
    ctx.font='900 36px sans-serif';
    ctx.fillText(config.name,540,326);
    ctx.fillStyle='#ffd866';
    ctx.font='800 16px sans-serif';
    ctx.fillText(config.notice,540,354);
    ctx.restore();
  }
};

const originalEnemyDraw=Enemy.prototype.draw;
Enemy.prototype.draw=function(){
  if(this.id!=='building-owner')return originalEnemyDraw.call(this);
  ctx.save();
  ctx.translate(this.x,this.y);
  ctx.fillStyle='#102c3455';
  ctx.beginPath();
  ctx.ellipse(0,38,39,11,0,0,Math.PI*2);
  ctx.fill();
  ctx.shadowColor=this.hit?'#fff':'#3a101c';
  ctx.shadowBlur=this.hit?18:9;
  ctx.fillStyle=this.hit?'#fff':'#771f35';
  ctx.strokeStyle='#32131c';
  ctx.lineWidth=3;
  ctx.beginPath();
  ctx.roundRect(-36,-35,72,73,19);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur=0;
  ctx.fillStyle='#f0c6a4';
  ctx.beginPath();
  ctx.arc(0,-24,24,0,Math.PI*2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle='#241a1b';
  ctx.beginPath();
  ctx.arc(0,-32,22,Math.PI,Math.PI*2);
  ctx.fill();
  ctx.strokeStyle='#2b1715';
  ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(-15,-29);ctx.lineTo(-5,-25);ctx.moveTo(15,-29);ctx.lineTo(5,-25);ctx.stroke();
  ctx.fillStyle='#2b1715';
  ctx.beginPath();ctx.arc(-8,-20,2.5,0,Math.PI*2);ctx.arc(8,-20,2.5,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#8b3c2e';
  ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(0,-15,10,.15,Math.PI-.15);ctx.stroke();
  ctx.fillStyle='#532032';
  ctx.beginPath();
  ctx.roundRect(-25,-5,50,38,8);
  ctx.fill();
  ctx.fillStyle='#f5d66e';
  ctx.beginPath();
  ctx.moveTo(0,-6);ctx.lineTo(7,19);ctx.lineTo(0,28);ctx.lineTo(-7,19);ctx.closePath();ctx.fill();
  ctx.font='27px sans-serif';
  ctx.textAlign='center';
  ctx.fillText('🔑',28,7);
  ctx.fillStyle='#30141ddd';
  ctx.beginPath();
  ctx.roundRect(-39,18,78,21,9);
  ctx.fill();
  ctx.fillStyle='white';
  ctx.font='900 11px sans-serif';
  ctx.fillText('건물주',0,33);
  healthBar(-34,43,68,7,this.hp/this.maxHp);
  ctx.restore();
};

game.reset();
