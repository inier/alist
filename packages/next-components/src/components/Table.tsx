import React, { useEffect, useContext } from 'react'
import { TableProvider, ListLifeCycleTypes, useToggle, ToggleContext, ListContext } from '@alist/react'
import { TableProps } from '@alifd/next/types/table'
import { IVirtualBoxProps, createVirtualBox, createControllerBox, FormExpressionScopeContext, complieExpression } from '@formily/next'
import { Table as NextTable } from '@alifd/next'
import { ColumnProps, ColumnGroupProps, GroupFooterProps, GroupHeaderProps } from '@alifd/next/types/table'
import moment from 'moment'
import styled, { css } from 'styled-components'
import { InternalSorter as Sorter } from './Sorter'

// 遵循最小可用原则来采集初始化的table属性
const pickInitialTableProps = (props) => {
    const result = {}
    const attrs = ['rowSelection', 'className', 'primaryKey']
    attrs.forEach(k => {
        if (k in props) {
            result[k] = props[k]
        }
    })
    return result
}

const VerCenterTitle = styled((props) => <div {...props} />)`
    display: flex;
    align-items: center;
`

const RecursionTable = (props) => {
    const { dataSource,
        hasExpandedRowCtrl = true, expandedRowIndent,
        isLoop = false, loopProps = {},
        isRoot,
        ...others
    } = props
    const hasExtraRow = (dataSource || []).find(item => Array.isArray(item.children) && item.children.length > 0)
    const { enableHookCrtl, openRowKeys, toggle, toggleAll, toggleState } = useToggle({...props, toggleeKey: 'openRowKeys' })
    const expandProps: any = {};
    
    const list: any = useContext(ListContext)
    useEffect(() => {
        if (isRoot) {
            list.actions.addAPI('toggle', toggle)
            list.actions.addAPI('toggleAll', toggleAll)
            list.actions.addAPI('getToggleState', () => toggleState)
        }
    })

    let defaultExpandedRowIndent = [1, 0]
    if (isLoop) {
        defaultExpandedRowIndent = [0, 0]
        if (hasExtraRow) {
            expandProps.expandedRowRender=(record) => <RecursionTable
                    hasHeader={false}
                    hasBorder
                    dataSource={record.children}
                    {...others}
                    {...loopProps}
                    isLoop
                />
        }
    }

    if (enableHookCrtl) {
        expandProps.openRowKeys = props.openRowKeys || openRowKeys
    }

    return <ToggleContext.Provider value={{ toggle, openRowKeys, toggleAll, toggleState }}>
        <NextTable
            dataSource={dataSource}
            {...expandProps}
            {...others}
            hasExpandedRowCtrl={hasExpandedRowCtrl}
            expandedRowIndent={expandedRowIndent || defaultExpandedRowIndent}
        />
    </ToggleContext.Provider>
}

const TableStyledWrapper = styled((props) => {
    const { loopBackground, hasBorder, ...others }  = props
    return <div {...others} />
})`
    margin-bottom: 16px;

    .alist-recursion-table {
        table {
            .next-table-expanded-row {        
                td {
                    border-width: ${(props) => ((props.hasBorder === undefined ? true : !!props.hasBorder) ? 1 : 0)}px;
                }
        
                & > td {
                    border-left-width: 0;
                    border-right-width: 0;
                }

                .next-table-row:last-child td {
                    border-bottom-width: 0;
                }

                & > td {
                    border-bottom-width: 0;
                }

                tr {
                    ${props => props.loopBackground && css`
                        background: ${props.loopBackground}
                    ` }
                }
            }
        }
    
        .next-table.no-header table {
            tr:first-child td {
                border-top-width: 0;
            }
        }   
    }

    & > .next-table > table > .next-table-body > .next-table-expanded-row:last-child > td{
        border-bottom-width: ${(props) => ((props.hasBorder === undefined ? true : !!props.hasBorder) ? 1 : 0)}px;
    }
`

type AListTableProps = TableProps & { loopBackground?: boolean }
type InternalTableType =  React.FunctionComponent<AListTableProps> & {
    Column: typeof NextTable.Column
    ColumnGroup: typeof NextTable.ColumnGroup,
    GroupHeader: typeof NextTable.GroupHeader,
    GroupFooter: typeof NextTable.GroupFooter,
}

const needComputeColumnProps = (itemProps) => ['moment', 'sortable'].filter(k => (k in (itemProps || {}))).length > 0
const computeColumnProps = (itemProps, opts) => {
    const cloneProps = { ...(itemProps || {}) }
    const { onSort } = opts || {}
    const { title, dataIndex } = cloneProps
    if (itemProps.sortable) {
        cloneProps.sortable = undefined;
        cloneProps.title = <VerCenterTitle>
            {title}
            <Sorter dataIndex={dataIndex} onSort={(dataIndex, order) => {
                onSort(dataIndex, order)
            }}/>
        </VerCenterTitle>
    }

    if (itemProps.moment) {
        cloneProps.cell = (val) => {
            const format = typeof itemProps.moment === 'string' ? itemProps.moment : 'YYYY-MM-DD HH:mm:ss';
            return val ? moment(isNaN(val) ? val : Number(val)).format(format) : null;
        }
    }

    return cloneProps
}

const noop = () => {}
const InternalTable: InternalTableType = props => {
    const { onSort = noop, onFilter = noop, ...others } = props
    const columns = React.Children.map(props.children, (item: any) => {
        if (!item) return item        
        if (needComputeColumnProps(item.props)) {
            const cloneProps = computeColumnProps(item.props, { onSort })
            return React.cloneElement(item, cloneProps)
        } else {
            return item
        }
    })

    return <TableStyledWrapper
        hasBorder={props.hasBorder}
        loopBackground={props.loopBackground}
    >
        <TableProvider pickInitialTableProps={pickInitialTableProps} {...others}>
            {(connectProps, list) => {
                return <RecursionTable
                    {...connectProps}
                    {...props}
                    children={columns}
                    isRoot
                    onFilter={(filterParams) => {
                        onFilter(filterParams)
                        list.notify(ListLifeCycleTypes.ON_LIST_FILTER, filterParams)
                    }}
                    className={`${connectProps.className || ''} ${props.className || ''} alist-recursion-table`}
                />
            }}
        </TableProvider>
    </TableStyledWrapper>
}

InternalTable.Column = NextTable.Column;
InternalTable.ColumnGroup = NextTable.ColumnGroup,
InternalTable.GroupHeader = NextTable.GroupHeader;
InternalTable.GroupFooter = NextTable.GroupFooter;

const ComponentMap = {
    'alist-table-column': InternalTable.Column,
    'alist-table-group-header': InternalTable.GroupHeader,
    'alist-table-group-footer': InternalTable.GroupFooter,
    'alist-table-column-group': InternalTable.ColumnGroup,
}


type ExtendsProps = {
    Column?: React.FC<IVirtualBoxProps<ColumnProps>>,
    ColumnGroup?: React.FunctionComponent<ColumnGroupProps>,
    GroupHeader?: React.FunctionComponent<GroupHeaderProps>,
    GroupFooter?: React.FunctionComponent<GroupFooterProps>,
}

const SchemaTable = (props) => {
    const { schema, children } = props
    const componentProps = schema.getExtendsComponentProps()
    const { columns, ...others } = componentProps
    if (columns) {
        return <InternalTable {...componentProps} />
    } else if (Array.isArray(children) && children.length) {
        const expressionScope = useContext(FormExpressionScopeContext)
        const tableColumns = children.map(child => {
            const targetComponent = child.props.schema.getExtendsComponent()
            const targetComponentProps = complieExpression(
                child.props.schema.getExtendsComponentProps(),
                expressionScope
            )
            
            if (targetComponent === 'alist-table-column-group') {
                return React.createElement(ComponentMap[targetComponent], {
                    ...targetComponentProps,
                    children: tableColumns(targetComponentProps.children)
                })
            } else {
                return React.createElement(ComponentMap[targetComponent], targetComponentProps)
            }            
        })

        return <InternalTable {...others}>
            {tableColumns}
        </InternalTable>
    }
    return null
}


type VirtualTableProps = React.FC<IVirtualBoxProps<AListTableProps>> & ExtendsProps
const Table: VirtualTableProps = createControllerBox<AListTableProps>('alist-table', SchemaTable)

Table.Column = createVirtualBox<ColumnProps>('alist-table-column', InternalTable.Column)
Table.GroupHeader = createVirtualBox<GroupHeaderProps>('alist-table-group-header', InternalTable.GroupHeader)
Table.GroupFooter = createVirtualBox<GroupFooterProps>('alist-table-group-footer', InternalTable.GroupFooter)
Table.ColumnGroup = createVirtualBox<ColumnGroupProps>('alist-table-column-group', InternalTable.ColumnGroup)

export {
    InternalTable,
    Table,
    SchemaTable,
    VirtualTableProps,
    AListTableProps,
    InternalTableType,
}
