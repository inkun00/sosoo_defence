import collectionStyles from './collection.css?inline';

// Keep the hero styling with the route code: a failed optional stylesheet
// request must not prevent the entire duel or worksheet screen from loading.
if(typeof document!=='undefined'&&!document.getElementById('collection-styles')){
 const style=document.createElement('style');style.id='collection-styles';
 style.textContent=collectionStyles;document.head.append(style);
}
