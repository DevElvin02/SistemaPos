#include <iostream>
#include <vector>
#include <algorithm>
#include <list>
using namespace std;

int main() {
    int dias;

    cout << "¿Cuantos dias de temperaturas desea registrar? ";
    cin >> dias;

   
    vector<float> temperaturas(dias);

    float suma = 0;
    
    for (int i = 0; i < dias; i++) {
        cout << "Ingrese la temperatura del dia " << (i + 1) << ": ";
        cin >> temperaturas[i]; 
        suma += temperaturas[i]; 
    }

    
    float* ptr = temperaturas.data();

    
    cout << "\nTemperaturas registradas:\n";
    for (int i = 0; i < dias; i++) {
        cout << "Dia " << (i + 1) << ": " << temperaturas[i] << " °C\n";
    }

    float buscada;
    cout << "\nIngrese la temperatura que desea buscar: ";
    cin >> buscada;

    bool encontrada = false;
    for (int i = 0; i < dias; i++) {
        if (temperaturas[i] == buscada) {
            cout << "La temperatura " << buscada 
                 << " °C se encontro en el dia " << (i + 1) << ".\n";
            encontrada = true;
            break;
        }
    }

     sort(temperaturas.begin(), temperaturas.end());

    cout << "\nTemperaturas ordenadas (menor a mayor):\n";
    for (int i = 0; i < dias; i++) {
        cout << temperaturas[i] << " °C\n";
    }

     if (!encontrada) {
        cout << "La temperatura " << buscada << " °C no existe en el registro.\n";
    }

    list<string> equipos;

    
    equipos.push_back("Equipo A");
    equipos.push_back("Equipo B");
    equipos.push_back("Equipo C");
    equipos.push_back("Equipo D");

   
    cout << "Lista de equipos registrados:\n";
        for (list<string>::iterator it = equipos.begin(); it != equipos.end(); ++it) {
            cout << "- " << *it << "\n";
    }

    
    string buscar;
    cout << "\nIngrese el nombre del equipo a buscar: ";
    getline(cin >> ws, buscar);

    auto it = find(equipos.begin(), equipos.end(), buscar);
    if (it != equipos.end()) {
        cout << "El equipo '" << buscar << "' SI esta en la lista.\n";
    } else {
        cout << "El equipo '" << buscar << "' NO se encuentra en la lista.\n";
    }

  
    equipos.sort();
    cout << "\nLista de equipos ordenada:\n";
    for (const auto& eq : equipos) {
        cout << "- " << eq << "\n";
    }


    string eliminar;
    cout << "\nIngrese el nombre del equipo a eliminar: ";
    getline(cin >> ws, eliminar);

    equipos.remove(eliminar);

    cout << "\nLista de equipos despues de eliminar '" << eliminar << "':\n";
    for (const auto& eq : equipos) {
        cout << "- " << eq << "\n";
    }

    float promedio = suma / dias;
    cout << "\nTemperatura promedio: " << promedio << " °C\n";

    return 0;
}
