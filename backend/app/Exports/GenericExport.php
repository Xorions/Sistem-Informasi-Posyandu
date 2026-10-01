<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class GenericExport implements FromCollection, WithHeadings
{
    protected $collection;

    public function __construct($collection)
    {
        $this->collection = $collection;
    }

    public function collection()
    {
        return $this->collection->map(function ($item) {
            $arr = is_array($item) ? $item : (method_exists($item, 'toArray') ? $item->toArray() : (array) $item);
            // flatten nested
            $flat = [];
            foreach ($arr as $k => $v) {
                $flat[$k] = is_array($v) || is_object($v) ? json_encode($v) : $v;
            }

            return $flat;
        });
    }

    public function headings(): array
    {
        if ($this->collection->isEmpty()) {
            return ['No data'];
        }
        $first = $this->collection->first();
        $arr = is_array($first) ? $first : (method_exists($first, 'toArray') ? $first->toArray() : (array) $first);

        return array_keys($arr);
    }
}
