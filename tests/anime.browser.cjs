require('./legacy-history-checks.cjs')('anime','anime',[
  ['anime/steins-gate/','anime-steins-gate'],
  ['anime/#era-childhood','anime-era-childhood'],
  ['anime/#era-unknown','anime-era-unknown']
]).catch(error=>{console.error(error);process.exitCode=1;});
