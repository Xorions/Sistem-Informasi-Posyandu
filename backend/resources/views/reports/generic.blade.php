<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $title }}</title>
    <style>
        body { font-family: sans-serif; font-size: 11px; color: #333; }
        h1 { font-size: 16px; margin-bottom: 8px; }
        p { font-size: 10px; color: #666; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; text-transform: uppercase; font-size: 9px; }
        tr:nth-child(even) { background-color: #fafafa; }
    </style>
</head>
<body>
    <h1>{{ ucwords(str_replace(['-', '_'], ' ', $title)) }}</h1>
    <p>Dicetak pada: {{ date('d-m-Y H:i:s') }}</p>
    @php
        $items = $data instanceof \Illuminate\Support\Collection ? $data->all() : (array) $data;
        $first = reset($items);
        $firstArray = is_array($first) ? $first : (is_object($first) ? (array) $first : []);
    @endphp
    @if(empty($items))
        <p>Tidak ada data untuk ditampilkan.</p>
    @else
        <table>
            <thead>
                <tr>
                    @foreach(array_keys($firstArray) as $col)
                        <th>{{ ucwords(str_replace('_', ' ', $col)) }}</th>
                    @endforeach
                </tr>
            </thead>
            <tbody>
                @foreach($items as $row)
                    @php $r = is_array($row) ? $row : (is_object($row) ? (array) $row : []); @endphp
                    <tr>
                        @foreach($r as $val)
                            <td>{{ is_array($val) || is_object($val) ? json_encode($val) : ($val ?? '-') }}</td>
                        @endforeach
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif
</body>
</html>
