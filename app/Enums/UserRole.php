<?php

namespace App\Enums;

enum UserRole: string
{
    case Sales = 'sales';
    case Supervisor = 'supervisor';
    case BranchManager = 'branch_manager';
    case Admin = 'admin';
}
