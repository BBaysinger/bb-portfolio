import { Link } from '@payloadcms/ui'
import type { DefaultServerCellComponentProps } from 'payload'
import { formatAdminURL } from 'payload/shared'
import React from 'react'

type ProjectRow = {
  id?: string | number
  shortTitle?: string | null
  title?: string | null
}

export const ProjectAdminTitleCell = ({
  cellData,
  className,
  collectionConfig,
  link,
  onClick,
  payload,
  rowData,
}: DefaultServerCellComponentProps) => {
  const record = rowData as ProjectRow
  const label =
    (typeof cellData === 'string' && cellData.trim()) ||
    (typeof record.shortTitle === 'string' && record.shortTitle.trim()) ||
    (typeof record.title === 'string' && record.title.trim()) ||
    'Untitled project'

  const adminRoute = payload.config.routes.admin
  const serverURL = payload.config.serverURL
  const sharedProps = {
    className,
    // style: {
    //   color: PROJECT_TITLE_GREEN,
    //   fontWeight: 600,
    // },
  }

  if (typeof onClick === 'function') {
    return (
      <button
        {...sharedProps}
        type="button"
        onClick={() => {
          onClick({
            cellData,
            collectionSlug: collectionConfig?.slug,
            rowData,
          })
        }}
      >
        {label}
      </button>
    )
  }

  if (link && collectionConfig?.slug && record.id != null) {
    return (
      <Link
        {...sharedProps}
        href={formatAdminURL({
          adminRoute,
          path: `/collections/${collectionConfig.slug}/${record.id}`,
          serverURL,
        })}
        prefetch={false}
      >
        {label}
      </Link>
    )
  }

  return <span {...sharedProps}>{label}</span>
}
