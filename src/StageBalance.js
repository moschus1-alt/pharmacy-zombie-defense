const STAGE_TOTAL=5;
const BUILDING_OWNER={id:'building-owner',name:'건물주',emoji:'🔑',hp:500,speed:12,damage:55,reward:50,color:'#7d2638'};
ENEMY_TYPES.push(BUILDING_OWNER);

const STAGES=[
  {name:'오전 민원',count:6,interval:2,hp:.95,damage:.9,reward:.75,pool:[0,1],newcomers:[0,1],notice:'기본 진상 · 6명'},
  {name:'가족 손님',count:8,interval:1.8,hp:1.05,damage:1,reward:.7,pool:[0,1,2,3],newcomers:[2,3],notice:'신규 적 · 어린이와 노인'},
  {name:'임대료 독촉',count:10,interval:1.6,hp:1.18,damage:1.1,reward:.65,pool:[0,1,2,3],newcomers:[7],notice:'강적 · 건물주'},
  {name:'전문직 압박',count:12,interval:1.45,hp:1.35,damage:1.2,reward:.6,pool:[0,1,2,3,7],newcomers:[4,5],notice:'신규 적 · 의사와 영업사원'},
  {name:'폐점 위기',count:14,interval:1.3,hp:1.55,damage:1.3,reward:.55,pool:[0,1,2,3,4,5,7],newcomers:[6,7],notice:'최종 적 · 의사좀비와 건물주'}
];

unitSprites.partTime=new Image();
unitSprites.beginner=new Image();
unitSprites.partTime.src='assets/characters-v1/part-time-pharmacist-walk-v1.png';
unitSprites.beginner.src='assets/characters-v1/beginner-pharmacist-walk-v1.png';

Object.assign(UNIT_TYPES.atc,{cost:55,hp:330,interval:10});
UNIT_TYPES['waste-medicine']={name:'폐의약품',cost:75,kind:'mine',hp:1,damage:230,blastRadius:145,color:'#ffd166'};
Object.assign(UNIT_TYPES['atc-strike'],{cost:185,hp:280,damage:30,rate:1.5});
Object.assign(UNIT_TYPES['pharm-part'],{cost:70,hp:220,damage:16,rate:1.25,spriteKey:'partTime'});
Object.assign(UNIT_TYPES['pharm-new'],{cost:125,hp:270,damage:24,rate:1,spriteKey:'beginner'});
Object.assign(UNIT_TYPES['pharm-vet'],{cost:220,hp:340,damage:46,rate:.85});
Object.assign(UNIT_TYPES['staff-part'],{cost:55,hp:500});
Object.assign(UNIT_TYPES['staff-new'],{cost:105,hp:900});
Object.assign(UNIT_TYPES['staff-vet'],{cost:160,hp:1500});

const originalUnitUpdate=Unit.prototype.update;
Unit.prototype.update=function(dt,game){
  if(this.kind==='producer'&&!this.productionStarted){this.productionStarted=true;this.timer=this.interval;}
  if(this.kind!=='mine')return originalUnitUpdate.call(this,dt,game);
  const contact=game.enemies.find(enemy=>enemy.row===this.row&&enemy.x-this.x<58&&enemy.x-this.x>-48);
  if(!contact)return;
  game.enemies.forEach(enemy=>{
    if(enemy.row===this.row&&Math.abs(enemy.x-this.x)<=this.blastRadius){enemy.hp-=this.damage;enemy.hit=.22;}
  });
  game.blasts.push({x:this.x,y:this.y,life:.42,maxLife:.42});
  this.hp=0;
  audio.sfx('blast');
  ui.message.textContent='폐의약품 폭발! 같은 라인의 진상에게 230 피해';
};

const originalUnitDraw=Unit.prototype.draw;
Unit.prototype.draw=function(){
  if(this.kind!=='mine')return originalUnitDraw.call(this);
  ctx.save();ctx.translate(this.x,this.y);
  ctx.fillStyle='#3d2d1fbb';ctx.beginPath();ctx.ellipse(0,28,39,12,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#6e6652';ctx.strokeStyle='#241f19';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(-31,-12,62,41,10);ctx.fill();ctx.stroke();
  ctx.strokeStyle='#ffd166';ctx.setLineDash([6,4]);ctx.strokeRect(-25,-6,50,29);ctx.setLineDash([]);
  ctx.fillStyle='#fff4c2';ctx.font='900 22px sans-serif';ctx.textAlign='center';ctx.fillText('☣',0,16);
  ctx.fillStyle='#253a35dd';ctx.beginPath();ctx.roundRect(-35,31,70,17,8);ctx.fill();ctx.fillStyle='white';ctx.font='900 9px sans-serif';ctx.fillText('폐의약품',0,43);
  ctx.restore();
};

const stageName=document.querySelector('#stage-name');
const roadmapItems=[...document.querySelectorAll('[data-stage-step]')];
const buildStageEnemy=(base,config)=>({...base,hp:Math.round(base.hp*config.hp),damage:Math.round(base.damage*config.damage),reward:Math.max(10,Math.round(base.reward*config.reward))});
const originalReset=Game.prototype.reset;
Game.prototype.reset=function(){
  originalReset.call(this);
  this.stage=1;
  this.wave=1;
  this.money=310;
  this.blasts=[];
  this.stageTimer=5;
  this.stageIntro=0;
  this.sync();
};

Game.prototype.prepareWave=function(){
  const config=STAGES[this.stage-1];
  const randomCount=Math.max(0,config.count-config.newcomers.length);
  const lineup=Array.from({length:randomCount},()=>config.pool[Math.floor(Math.random()*config.pool.length)]).concat(config.newcomers);
  this.spawnQueue=lineup.map((enemyIndex,index)=>({delay:2.6+index*config.interval,row:index<GRID.rows?index:Math.floor(Math.random()*GRID.rows),type:buildStageEnemy(ENEMY_TYPES[enemyIndex],config)}));
  this.spawnClock=0;
  this.stageTimer=5;
  this.stageIntro=2.8;
  ui.message.textContent=`스테이지 ${this.stage} · ${config.name} — ${config.notice}`;
};

Game.prototype.update=function(dt){
  if(!this.running||this.paused||this.over)return;
  this.stageIntro=Math.max(0,this.stageIntro-dt);
  this.spawnClock+=dt;
  while(this.spawnQueue.length&&this.spawnClock>=this.spawnQueue[0].delay){
    const spawn=this.spawnQueue.shift();
    this.enemies.push(new Enemy(spawn.type,spawn.row,0));
  }
  this.dropTimer-=dt;
  if(this.dropTimer<=0){
    const drop=new Drop(GRID.x+60+Math.random()*(GRID.cw*GRID.cols-120),0);
    drop.value=20;
    this.drops.push(drop);
    this.dropTimer=7+Math.random()*2;
  }
  this.units.forEach(unit=>unit.update(dt,this));
  this.blasts.forEach(blast=>blast.life-=dt);
  this.drops.forEach(drop=>{if(drop.source==='shelf')drop.value=25;});
  this.enemies.filter(enemy=>enemy.hp>0).forEach(enemy=>enemy.update(dt,this));
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
  this.blasts=this.blasts.filter(blast=>blast.life>0);
  if(!this.spawnQueue.length&&!this.enemies.length){
    this.stageTimer-=dt;
    if(this.stageTimer<=0){
      if(this.stage>=STAGE_TOTAL)this.win();
      else{
        const clearBonus=15+this.stage*5;
        this.money+=clearBonus;
        this.stage++;
        this.wave=this.stage;
        this.prepareWave();
        audio.sfx('wave');
      }
    }
  }else this.stageTimer=5;
  this.sync();
};

Game.prototype.sync=function(){
  const config=STAGES[(this.stage||1)-1];
  ui.money.textContent=Math.floor(this.money||0);
  ui.wave.textContent=this.stage||1;
  if(stageName)stageName.textContent=config.name;
  roadmapItems.forEach((item,index)=>{
    const number=index+1;
    item.classList.toggle('active',number===(this.stage||1));
    item.classList.toggle('cleared',number<(this.stage||1));
  });
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
  this.blasts.forEach(blast=>{
    const progress=1-blast.life/blast.maxLife,alpha=Math.max(0,blast.life/blast.maxLife),radius=34+progress*112;
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(blast.x,blast.y);
    const glow=ctx.createRadialGradient(0,0,8,0,0,radius);glow.addColorStop(0,'#fff7b5');glow.addColorStop(.32,'#ffb52e');glow.addColorStop(.72,'#e74b2f88');glow.addColorStop(1,'#2e151000');
    ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#fff1a8';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,radius*.7,0,Math.PI*2);ctx.stroke();ctx.restore();
  });
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
