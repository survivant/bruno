import produce from 'immer';
import find from 'lodash/find';
import filter from 'lodash/filter';
import { uuid } from 'utils/common';

const reducer = (state, action) => {
  switch (action.type) {
    case 'ADD_VAR': {
      return produce(state, (draft) => {
        draft.variables.push({
          uid: uuid(),
          name: '',
          value: '',
          type: 'text',
          secret: false,
          enabled: true
        });
        draft.hasChanges = true;
      });
    }

    case 'UPDATE_VAR': {
      return produce(state, (draft) => {
        const variable = find(draft.variables, (v) => v.uid === action.variable.uid);
        variable.name = action.variable.name;
        variable.value = action.variable.value;
        variable.enabled = action.variable.enabled;
        variable.secret = action.variable.secret;
        draft.hasChanges = true;
      });
    }

    case 'DELETE_VAR': {
      return produce(state, (draft) => {
        draft.variables = filter(draft.variables, (v) => v.uid !== action.variable.uid);
        draft.hasChanges = true;
      });
    }

    case 'CHANGES_SAVED': {
      return produce(state, (draft) => {
        draft.hasChanges = false;
      });
    }

    case 'ADD_LINES': {
      if (Array.isArray(action.lines)) {
        // Vérifiez si action.lines est un tableau
        return produce(state, (draft) => {
          action.lines.forEach((newLine) => {
            draft.variables.push({
              uid: uuid(),
              name: newLine.name,
              value: newLine.value,
              type: 'text',
              secret: false,
              enabled: true
            });
          });
          draft.hasChanges = true;
        });
      } else {
        // Gérez ici le cas où action.lines n'est pas un tableau
        return state; // Ou renvoyez le state inchangé
      }
    }

    case 'UPDATE_VARIABLES': {
      return produce(state, (draft) => {
        try {
          draft.variables = action.variables; // Mettez à jour les variables avec le texte brut
          draft.hasChanges = true;
        } catch (error) {
          // Gérez les erreurs de syntaxe JSON ici si nécessaire.
          console.log(error);
        }
      });
    }

    default: {
      return state;
    }
  }
};

export default reducer;
