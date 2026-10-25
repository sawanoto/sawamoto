require('./legacy-history-checks.cjs')('games','game',[
  ['games/pokemon-leafgreen/','game-pokemon-leafgreen'],
  ['games/nameko/','game-nameko']
]).catch(error=>{console.error(error);process.exitCode=1;});
