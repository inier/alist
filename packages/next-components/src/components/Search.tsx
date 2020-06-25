import React from 'react'
import { Consumer } from '@alist/react'
import { createVirtualBox } from '@formily/next'
import { Submit } from '@formily/next'

const InternalSearch = (props) => {
    const { render, content, children, ...others } = props
    return <Consumer>
        {({ search }) => {
            if (typeof render === 'function') {
                return render(search)
            }

            return <Submit {...others} onSubmit={(values) => {
                search()
            }}>
                {content || children}
            </Submit>
        }}
    </Consumer>
}

createVirtualBox('search', InternalSearch)
const Search = createVirtualBox('alist-search', InternalSearch)

export {
    Search,
    InternalSearch,
}