import { Formity } from 'formity'

import components from './components'
import schema from './schema'

export default function Form ({ onReturn }) {
    return (
        <Formity components={components} schema={schema} onReturn={onReturn} />
    )
}
