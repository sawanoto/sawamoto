require('./legacy-history-checks.cjs')('reading','reading',[
  ['reading/#reading-book-034','reading-book-034'],
  ['reading/#reading-book-028','reading-book-028'],
  ['movie-history/#sakura','movie-sakura'],
  ['movie-history/#preferences','movie-preferences'],
  ['about/#timeline-first-child-parental-leave','life-first-child-parental-leave']
]).catch(error=>{console.error(error);process.exitCode=1;});
