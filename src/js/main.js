'use strict';

import Cycle from 'cyclejs';
const {h} = Cycle;
import hashtag from 'hashtag';
import mori from 'mori';
const {merge, assoc, conj} = mori;

const storedIdeasData = mori.toClj(JSON.parse(localStorage.getItem('ideas')));
const defaultIdeasData = mori.hashMap('ideas', mori.vector(), 'input', '');

const initialData$ = Cycle.Rx.Observable.just(
  merge(defaultIdeasData, storedIdeasData));

function localStorageSink(ideasData) {
  localStorage.setItem('ideas', JSON.stringify(ideasData));
}
function makeModification$(intents) {
  const insertIdeaMod$ = intents.addIdea$.map((ideaText) => (ideasData) => {

    const newIdeas = conj(mori.get(ideasData, 'ideas'), mori.hashMap(
      'message', ideaText,
      'date', Date.now(),
      'hashtags', hashtag.parse(ideaText).tags
    ));

    return assoc(ideasData, 'ideas', newIdeas);
  });

  return Cycle.Rx.Observable.merge(insertIdeaMod$);
}

const filters = {
  hashtag(text) {
    return hashtag.parse(text).tokens.map((token) => {
      if(token.type === 'text') {
        return token.text;
      }
      return <span className="hashtag">#{token.tag}</span>;
    });
  }
};

function view(ideas$) {
  return ideas$.map(ideaData =>
    <div>
      <input autofocus type="text" value={''} className="myinput"/>
      <hr />
      <ul>
      {
        ideaData.ideas.reverse().map(idea =>
          <li>{filters.hashtag(idea.message)}</li>
        )
      }
      </ul>
    </div>
  );
}

function intent(interactions) {
  return {
    addIdea$: interactions.get('.myinput', 'keyup')
      .filter(ev => ev.keyCode === 13 && ev.target.value.trim() !== '')
      .map(ev => ev.target.value),
    activeApp$: Cycle.Rx.Observable.fromEvent(window, 'hashchange')
  };
}

function model(intents, source) {
  const modification$ = makeModification$(intents);

  return modification$
    .merge(source)
    .scan((todosData, modFn) => modFn(todosData))
    .map(mori.toJs)
    .shareReplay(1);
}

function computer(interactions) {
  const ideas$ = model(intent(interactions), initialData$);
  ideas$.subscribe(localStorageSink);

  return view(ideas$);
}

Cycle.applyToDOM(document.body, computer);

