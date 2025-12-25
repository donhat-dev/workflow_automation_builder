# -*- coding: utf-8 -*-
{
    'name': 'Workflow Pilot',
    'version': '1.0.0',
    'summary': """ Workflow_pilot Summary """,
    'author': '',
    'website': '',
    'category': '',
    'depends': ['base', 'web'],
    'data': [
        'data/workflow_pilot_menu.xml',
    ],
    'assets': {
              'web.assets_backend': [
                  'workflow_pilot/static/lib/dagre.js/dagre.min.js',
                  'workflow_pilot/static/src/**/*'
              ],
          },
    'application': True,
    'installable': True, 
    'auto_install': False,
    'license': 'LGPL-3',
}
